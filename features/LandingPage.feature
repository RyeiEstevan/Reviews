Feature: Landing Page (Feed)
  As a platform user
  I want to access the landing page
  So that I can see trending works, popular reviews, and easily search for content

  Scenario: Viewing trending works (Em Alta)
    Given I am on the platform's landing page
    Then I can see the "Em Alta" section
    And it displays a list of currently trending works, such as "Top Gun" and "Naruto"
    And these works are ordered strictly by the amount of recent evaluations

  Scenario: Viewing top-rated reviews (Popular Reviews)
    Given I am on the platform's landing page
    Then I can see the "Popular Reviews" section
    And it displays reviews with their respective authors and ratings, like a 5-star review for "Carros"
    And only works that reached the minimum required number of evaluations are shown in this section

  Scenario: Navigating through horizontal carousels
    Given I am viewing the "Em Alta" or "Popular Reviews" section on the landing page
    When I click the next horizontal arrow (">")
    Then the list scrolls horizontally to display more items available in that category

  Scenario: Searching for a work directly from the landing page
    Given I am on the platform's landing page
    When I enter the exact term "Bob Esponja" in the top search bar
    And I click the search icon
    Then I am redirected to the search results page
    And I can see the list of works that exactly match the searched term