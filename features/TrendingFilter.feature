Feature: Trending Filter

Scenario: Audience Filtering in the Service Layer
  Given that in the database the work "Short Film" has average 5.0 based on 5 ratings
  And the work "The Godfather" has average 4.9 based on 1,200 ratings
  And the service rule requires a minimum quorum of 50 ratings for the ranking
  When the service receives a request to generate the "Top Rated" list
  Then the service processes the aggregation of ratings validating the quorum
  And returns a dataset that includes the work "The Godfather"
  And completely omits the work "Short Film" from the generated response.

Scenario: Temporal calculation for the "Trending" ranking
  Given the work "Old Classic" has 100,000 total views, with only 10 recorded in the last 30 days
  And the work "Recent Release" has 500 total views, with 450 recorded in the last 30 days
  When the service receives a request to process the "Trending" ranking with period set to "month"
  Then the service performs the query filtering interactions only by the recent 30-day period
  And returns the result list ranking "Recent Release" higher than "Old Classic".

Scenario: Category segmentation in the Popularity ranking
  Given the work "Global Blockbuster" is a "movie" with high traction
  And the work "National Series" is a "series" with high traction
  When the service receives a ranking request with filter set to "series"
  Then the service applies the category filter
  And returns the dataset with the work "National Series"
  And omits the work "Global Blockbuster" from the generated response.

Scenario: Quorum failure due to insufficient volume
  Given the database only contains works with fewer than 50 ratings each
  And the service rule requires a minimum quorum of 50 ratings for the ranking
  When the service receives a request to generate the "Top Rated" list
  Then the service processes the validation and identifies that no work reached the threshold
  And returns an empty dataset instead of listing works with low quorum
  And the system writes a "WARN: top_rated aggregation returned 0 items. Quorum threshold not met for current period." record for monitoring.

Scenario: Relevance failure due to expired time window
  Given the work "1990 Box Office Hit" has 1,000,000 total ratings and 0 ratings in the last 30 days
  And the work "Viral Indie" has 1,000 ratings, all recorded in the last 24 hours
  When the service processes the "Trending" ranking incorrectly ignoring the date filter
  Then the system should identify the inconsistency between total volume and time-based volume
  And the work "1990 Box Office Hit" should not appear at the top of the "Trending" ranking
  And an "ERROR: trending aggregation bypassed temporal date_filter." alert should be recorded in the logs.