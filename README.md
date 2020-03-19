# TAMU-Howdy-Data

A self-updating record of Texas A&M course data, drawn from the [Compass](https://compassxe-ssb.tamu.edu/StudentRegistrationSsb/ssb/registration/registration) API.
This repository will create a release automatically on the first of each month, containing the data in Compass at that time.

At the time of writing (3/19/2020), the uncompressed data totals around 1.7 GB. The compressed data is around 87 MB.

## Running Locally
This assumes that you have [TypeScript](https://typescriptlang.org) installed.
Just run:
```shell script
npm i
npm start
```
This should take a little bit over an hour.

## Contributing
Things that would be awesome:

- [ ] Increasing parallelization and parsing speed
- [ ] Increasing the amount of data collected
- [ ] Improving type definitions based on data collected
- [ ] Building a simple library for interacting with the API in a simple way.
