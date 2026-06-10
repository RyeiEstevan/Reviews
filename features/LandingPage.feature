# features/LandingPage.feature
Feature: landing page
  As a platform user
  I want to access the landing page
  So that I can see trending works, top-rated works and search for content

  Scenario: view trending works
    Given the system has the trending works "Dune: Part Two" and "Shōgun"
    When I view the landing page
    Then the trending works are listed ordered by their recent 30-day view count

  Scenario: view top-rated works
    Given the system has the top-rated work "Shōgun" with average score "9.4"
    When I view the landing page
    Then the top-rated works are listed ordered by their average score

  Scenario: browse more trending works than the initial view
    Given the system has more trending works than fit in the initial view
    When I view the landing page
    Then I can reach the trending works beyond the initial view

  Scenario: search for a work from the landing page
    Given the system has a work titled "Fallout"
    When I search for "Fallout" from the landing page
    Then the works matching "Fallout" are listed
