import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatBiKurs, parseBiKursXml } from '../src/tools/bi-kurs.js';
import {
  formatCryptoComparison,
  formatCryptoPrices,
  normalizeIndodaxTickers,
  normalizePintuPrices,
} from '../src/tools/crypto.js';

describe('id-finance parsers and formatters', () => {
  it('parses Bank Indonesia XML and formats exchange rate summary', () => {
    const xml = `<NewDataSet>
      <Table>
        <nil_subkurslokal>1.00</nil_subkurslokal>
        <beli_subkurslokal>18126.91</beli_subkurslokal>
        <jual_subkurslokal>18309.09</jual_subkurslokal>
        <tgl_subkurslokal>2026-11-16T00:00:00+07:00</tgl_subkurslokal>
        <mts_subkurslokal>USD  </mts_subkurslokal>
      </Table>
    </NewDataSet>`;

    const rows = parseBiKursXml(xml);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.currency, 'USD');
    assert.equal(rows[0]?.date, '2026-11-16');
    assert.equal(rows[0]?.mid, (18126.91 + 18309.09) / 2);

    const output = formatBiKurs('USD', rows);
    assert.match(output, /Bank Indonesia Kurs Transaksi: \*\*USD\/IDR\*\*/);
    assert.match(output, /Date: 2026-11-16/);
  });

  it('normalizes Indodax and Pintu prices and formats comparison', () => {
    const indodax = normalizeIndodaxTickers({
      btc_idr: {
        buy: '1183000000',
        sell: '1184000000',
        last: '1183500000',
        high: '1200000000',
        low: '1170000000',
        name: 'Bitcoin',
      },
      btc_usdt: {
        buy: '90000',
        sell: '90100',
        last: '90050',
        high: '91000',
        low: '89000',
        name: 'Bitcoin',
      },
    });
    assert.equal(indodax.length, 1);
    assert.equal(indodax[0]?.symbol, 'BTC');

    const pintu = normalizePintuPrices([
      {
        pair: 'btc/idr',
        latestPrice: '1180000000',
        day: '1.25',
        week: '4.50',
        month: '10.00',
        year: '50.00',
      },
      {
        pair: 'btc/usdt',
        latestPrice: '90000',
        day: '1.0',
        week: '2.0',
        month: '3.0',
        year: '4.0',
      },
    ]);
    assert.equal(pintu.length, 1);
    assert.equal(pintu[0]?.symbol, 'BTC');

    const listText = formatCryptoPrices([...indodax, ...pintu], ['BTC'], 10);
    assert.match(listText, /\*\*BTC\/IDR\*\* \(Indodax\)/);
    assert.match(listText, /\*\*BTC\/IDR\*\* \(Pintu\)/);

    const cmpText = formatCryptoComparison('BTC', indodax[0], pintu[0]);
    assert.match(cmpText, /\*\*BTC\/IDR\*\* Exchange Comparison/);
    assert.match(cmpText, /Spread \(Indodax vs Pintu\)/);
  });
});
