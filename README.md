# TAMU-Howdy-Data
JSON representations of Texas A&amp;M University course data, going all the way back to 2009.
This data is updated on the first of every month, making it unsuitable for making scheduling decisions.
However, it could be useful for data analysis like determining if a course will be offered during a specific semester or not.

To run the Ruby script that collects the data locally, you'll want to have Ruby 2.7.0 installed. There aren't any external dependencies, no need to `bundle install` or anything like that.

Simply run `scrape.rb` and wait for the script to complete. This will take ~45 minutes (on university ethernet):

```sh
ruby scrape.rb 146.96s user 11.85s system 6% cpu 43:09.63 total
```