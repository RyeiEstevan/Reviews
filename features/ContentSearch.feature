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
		When I search for the term "Vingadoes"
		Then I can see a "No results found" screen
		And no works are returned for the searched term
		And I can still see the searched term "Vingadoes" in the search bar

	Scenario: search content with a non-existent term
		Given the system has some content stored
		When I search for the term "UnknownTitle123"
		Then I can see a "No results found" screen
		And no works are returned for the searched term

	Scenario: search content by title
		Given the system has some content stored
		When I search for the term "Titanic"
		Then I can see works that match the searched term
