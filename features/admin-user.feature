Feature: Admin user

  As an administrator of the Reviews platform
  I want to create, remove and edit users, delete common user accounts,
  register artists, authors, voice actors, and publish news
  So that the content, catalog and community of the platform stay organised

  Scenario: ban a common user successfully
    Given the admin identifies a user who violated the rules
    When the admin bans the user from the moderation panel
    Then the user content is hidden from everyone but not deleted

  Scenario: create a news post with tags and see it on the feed
    Given the admin publishes a news post with free tags
    When the news post is created
    Then the news post shows up on the common users feed with its tags highlighted

  Scenario: common admin tries to remove another admin and is blocked
    Given a common admin (not the superadmin) tries to remove another admin
    When the common admin confirms the removal action
    Then the system blocks the action and both admins remain active

  Scenario: admin tries to register an artist without a name and is rejected
    Given the admin opens the artist registration form
    When the admin submits the form with an empty name field
    Then the system rejects the submission and shows a required field message
    And the form keeps the values the admin already filled for the other fields
