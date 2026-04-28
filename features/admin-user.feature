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

  Scenario: admin schedules a news post for future publication
    Given the admin drafts a news post and picks a future publication date
    When the scheduled time arrives
    Then the news post becomes visible on the common users feed automatically

  Scenario: admin edits an existing user email with success
    Given the admin is authenticated and opens the user management screen
    And the target user has an active account
    When the admin edits the user email and confirms the change
    Then the user record is updated with the new email
    And the user receives a confirmation email with a verification link
    And the audit log stores the admin username, the old email and the new email

  Scenario: admin registers a new voice actor successfully
    Given the admin opens the artist registration form
    When the admin fills the name, role voice-actor and confirms
    Then the system persists the new voice actor in the catalog

  Scenario: admin deletes a common user account permanently
    Given the admin selects a common user with status active
    When the admin confirms the permanent account deletion
    Then the user account is removed and their content becomes inaccessible

  Scenario: admin promotes a common user to moderator
    Given the admin selects a common user with good standing
    When the admin confirms the promotion to moderator
    Then the user receives moderator privileges and is notified by email
