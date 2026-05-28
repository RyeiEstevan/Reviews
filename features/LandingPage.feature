Feature: Landing Page (Feed)
  As a platform user
  I want to access the landing page
  So that I can see trending works, popular reviews, and easily search for content

  Background:
    Given I am on the platform's landing page

  Scenario: Viewing trending works (Em Alta)
    When I look at the "Em Alta" section
    Then I should see a list of currently trending works, such as "Dune: Part Two" and "Shōgun"
    And the works should be ordered strictly by their total view count

  Scenario: Viewing top-rated reviews (Mais bem avaliados)
    When I look at the "Mais bem avaliados da semana" section
    Then I should see works with their respective scores, like a 9.4 rating for "Shōgun"
    And the works should be ordered strictly by their average score

  Scenario: Navigating through horizontal carousels
    When I click the next horizontal arrow (">") in the "Em Alta" section
    Then the list should scroll horizontally to display more items

  Scenario: Searching for a work directly from the landing page
    When I fill in the search bar with "Fallout"
    And I submit the search
    Then I should be on the search results page
    And I should see a list of works that exactly match "Fallout"