Feature: Content Search
	As a platform user
	I want to search for content by entering a term in the search bar
	So that I can find works by title, synopsis or description

	Scenario: search content by exact match
		Given the system has some content stored
		When I search for the term "Avengers: Endgame"
		Then I can see the list of works that exactly match the searched term
		And the returned results contain works with the term in the title, synopsis or description

	Scenario: search content with a spelling mistake
		Given the system has some content stored
		When I search for the term "Avengrs"
		Then I can see a "No results found" screen
		And no works are returned for the searched term
		And I can still see the searched term "Avengrs" in the search bar

	Scenario: search content with a non-existent term
		Given the system has some content stored
		When I search for the term "UnknownTitle123"
		Then I can see a "No results found" screen
		And no works are returned for the searched term

	Scenario: search content by title
		Given the system has some content stored
		When I search for the term "Titanic"
		Then I can see works that match the searched term

	#backend/service scenarios
	Scenario: backend returns media when title matches query
		Given the system has a movie titled "Avengers: Endgame" stored in the database
		And the system has a series titled "The Avengers" stored in the database
		When the system processes a search query for "Avengers"
		Then the search returns 2 results
		And the results include "Avengers: Endgame"
		And the results include "The Avengers"

	Scenario: backend returns empty results for non-existent term
		Given the system has a movie titled "Avengers: Endgame" stored in the database
		When the system processes a search query for "Avengrs"
		Then the search returns 0 results
