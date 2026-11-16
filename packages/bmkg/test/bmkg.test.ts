import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatEarthquake } from '../src/tools/earthquake.js';
import { formatWeatherForecast } from '../src/tools/weather.js';
import { buildWilayahUrl, formatRegionList } from '../src/tools/wilayah.js';

describe('bmkg formatters and helpers', () => {
  it('formats earthquake alerts with shakemap and felt report', () => {
    const output = formatEarthquake(
      {
        Tanggal: '16 Nov 2026',
        Jam: '18:36:57 WIB',
        DateTime: '2026-11-16T11:36:57+00:00',
        Coordinates: '-5.41,104.60',
        Lintang: '5.41 LS',
        Bujur: '104.60 BT',
        Magnitude: '5.4',
        Kedalaman: '10 km',
        Wilayah: '12 km Barat Laut Tanggamus-Lampung',
        Potensi: 'Tidak berpotensi tsunami',
        Dirasakan: 'III Tanggamus',
        Shakemap: '20261116183657.mmi.jpg',
      },
      1,
    );

    assert.match(output, /^1\. \*\*M5\.4\*\* — 12 km Barat Laut Tanggamus-Lampung/);
    assert.match(output, /Tsunami\/Impact: Tidak berpotensi tsunami/);
    assert.match(output, /Felt \(MMI\): III Tanggamus/);
    assert.match(output, /https:\/\/data\.bmkg\.go\.id\/DataMKG\/TEWS\/20261116183657\.mmi\.jpg/);
  });

  it('formats weather forecast respecting maxDays', () => {
    const output = formatWeatherForecast(
      {
        adm1: '31',
        adm2: '31.71',
        adm3: '31.71.03',
        adm4: '31.71.03.1001',
        desa: 'Kemayoran',
        kecamatan: 'Kemayoran',
        kotkab: 'Kota Adm. Jakarta Pusat',
        provinsi: 'DKI Jakarta',
        lat: -6.16,
        lon: 106.84,
        timezone: '+0700',
      },
      [
        [
          {
            local_datetime: '2026-11-17 00:00:00',
            t: 27,
            hu: 84,
            weather_desc: 'Cerah',
            weather_desc_en: 'Sunny',
            wd: 'W',
            ws: 1.3,
            tcc: 59,
            tp: 0,
          },
        ],
        [
          {
            local_datetime: '2026-11-18 00:00:00',
            t: 29,
            hu: 75,
            weather_desc: 'Berawan',
            weather_desc_en: 'Cloudy',
            wd: 'NW',
            ws: 2.0,
            tcc: 80,
            tp: 0,
          },
        ],
      ],
      1,
    );

    assert.match(output, /Weather Forecast: \*\*Kemayoran/);
    assert.match(output, /### Day 1/);
    assert.match(output, /Cerah \(Sunny\) \| 27°C \| Humidity: 84%/);
    assert.doesNotMatch(output, /### Day 2/);
  });

  it('builds wilayah URLs and filters region lists', () => {
    assert.equal(buildWilayahUrl('provinces'), 'https://wilayah.id/api/provinces.json');
    assert.equal(
      buildWilayahUrl('villages', '31.71.03'),
      'https://wilayah.id/api/villages/31.71.03.json',
    );
    assert.throws(() => buildWilayahUrl('regencies'), /parentCode is required/);

    const list = formatRegionList(
      'provinces',
      [
        { code: '31', name: 'DKI Jakarta' },
        { code: '32', name: 'Jawa Barat' },
      ],
      undefined,
      'jakarta',
    );
    assert.match(list, /1 result\(s\)/);
    assert.match(list, /\*\*DKI Jakarta\*\* — `31`/);
    assert.doesNotMatch(list, /Jawa Barat/);
  });
});
