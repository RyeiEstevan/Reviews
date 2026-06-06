"""pytest-bdd step definitions for features/admin-user.feature (Usuário Administrador).

Service/API tests: each scenario drives the real FastAPI routes over an in-memory
mongomock-motor database and asserts the persisted state (users, posts, comments,
catalog, news, audit log) — never the UI.
"""

from pytest_bdd import given, when, then, parsers, scenario

from app.db.models import CatalogContributor, Comment, News, Post, User

FEATURE = "admin-user.feature"


# --------------------------------------------------------------------------- #
# Scenario bindings
# --------------------------------------------------------------------------- #
@scenario(FEATURE, "non-admin user cannot access admin endpoints")
def test_non_admin_blocked():
    pass


@scenario(FEATURE, "admin creates a common user successfully")
def test_admin_creates_common():
    pass


@scenario(FEATURE, "superadmin creates an admin account successfully")
def test_superadmin_creates_admin():
    pass


@scenario(FEATURE, "common admin cannot create an admin account")
def test_common_admin_cannot_create_admin():
    pass


@scenario(FEATURE, "common admin tries to remove another admin and is blocked")
def test_common_admin_cannot_delete_admin():
    pass


@scenario(FEATURE, "superadmin permanently deletes an admin account")
def test_superadmin_deletes_admin():
    pass


@scenario(FEATURE, "admin edits an existing user email successfully")
def test_admin_edits_email():
    pass


@scenario(FEATURE, "admin bans a common user successfully")
def test_admin_bans_user():
    pass


@scenario(FEATURE, "admin unbans a previously banned user")
def test_admin_unbans_user():
    pass


@scenario(FEATURE, "admin deletes a common user account permanently")
def test_admin_deletes_user_cascade():
    pass


@scenario(FEATURE, "admin registers a new voice actor successfully")
def test_admin_registers_voice_actor():
    pass


@scenario(FEATURE, "admin tries to register an artist without a name and is rejected")
def test_admin_registers_artist_no_name():
    pass


@scenario(FEATURE, "admin searches for an artist by partial name")
def test_admin_searches_artist():
    pass


@scenario(FEATURE, "admin creates a news post with tags")
def test_admin_creates_news():
    pass


@scenario(FEATURE, "common visitors see admin news on the public feed")
def test_public_news_feed():
    pass


@scenario(FEATURE, "listing users does not modify stored data")
def test_listing_is_side_effect_free():
    pass


@scenario(FEATURE, "audit log records the registration of a new artist")
def test_audit_records_artist():
    pass


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _seed_user(run, context, username, role="common", status="active", email=None):
    user = User(username=username, role=role, status=status, email=email)
    run(user.insert())
    context.setdefault("ids", {})[username] = str(user.id)
    return user


# --------------------------------------------------------------------------- #
# Given — authentication
# --------------------------------------------------------------------------- #
@given(parsers.parse('the common user "{username}" is authenticated'))
def given_common_authenticated(auth, context, username):
    context["headers"] = auth(username, "common")
    context["actor"] = username


@given(parsers.parse('the admin "{username}" is authenticated'))
def given_admin_authenticated(auth, context, username):
    context["headers"] = auth(username, "admin")
    context["actor"] = username


@given(parsers.parse('the admin "{username}" is authenticated with role "{role}"'))
def given_admin_authenticated_role(auth, context, username, role):
    context["headers"] = auth(username, role)
    context["actor"] = username


@given(parsers.parse('the superadmin "{username}" is authenticated'))
def given_superadmin_authenticated(auth, context, username):
    context["headers"] = auth(username, "superadmin")
    context["actor"] = username


# --------------------------------------------------------------------------- #
# Given — preconditions / seeding
# --------------------------------------------------------------------------- #
@given(parsers.parse('no account exists with username "{username}"'))
@then(parsers.parse('no account exists with username "{username}"'))
def no_account_exists(run, username):
    assert run(User.find_one(User.username == username)) is None


@given(parsers.parse('the user "{username}" exists with role "{role}" and status "{status}"'))
def given_user_exists_role_status(run, context, username, role, status):
    _seed_user(run, context, username, role=role, status=status)


@given(parsers.parse('the active user "{username}" has email "{email}"'))
def given_active_user_with_email(run, context, username, email):
    _seed_user(run, context, username, role="common", status="active", email=email)


@given(parsers.parse('the common user "{username}" has a public post "{title}"'))
def given_common_user_with_public_post(run, context, username, title):
    _seed_user(run, context, username, role="common")
    post = Post(owner=username, title=title, hidden=False)
    run(post.insert())
    context.setdefault("posts", {})[title] = str(post.id)


@given(parsers.parse('the user "{username}" has status "{status}"'))
def given_user_with_status(run, context, username, status):
    _seed_user(run, context, username, role="common", status=status)


@given(parsers.parse('the post "{title}" owned by "{username}" is hidden'))
def given_hidden_post(run, context, title, username):
    post = Post(owner=username, title=title, hidden=True)
    run(post.insert())
    context.setdefault("posts", {})[title] = str(post.id)


@given(parsers.parse('the common user "{username}" owns the post "{title}"'))
def given_common_user_owns_post(run, context, username, title):
    _seed_user(run, context, username, role="common")
    post = Post(owner=username, title=title, hidden=False)
    run(post.insert())
    context.setdefault("posts", {})[title] = str(post.id)


@given(parsers.parse('the post "{title}" has the comment "{content}"'))
def given_post_has_comment(run, context, title, content):
    post_id = context["posts"][title]
    comment = Comment(author="someone", content=content, post_id=post_id)
    run(comment.insert())
    context.setdefault("comments", {})[content] = str(comment.id)


@given(parsers.parse('no catalog contributor exists with name "{name}"'))
def given_no_contributor(run, name):
    assert run(CatalogContributor.find_one(CatalogContributor.name == name)) is None


@given("the catalog has no contributor with an empty name")
def given_no_empty_contributor(run):
    assert run(CatalogContributor.find_one(CatalogContributor.name == "")) is None


@given(parsers.parse('the catalog contains the contributor "{name}" with role "{role}"'))
def given_catalog_contains(run, name, role):
    run(CatalogContributor(name=name, role=role).insert())


@given(parsers.parse('no news post exists with title "{title}"'))
def given_no_news(run, title):
    assert run(News.find_one(News.title == title)) is None


@given(parsers.parse('a published news post titled "{title}" with tags "{tags}" exists'))
def given_published_news(run, title, tags):
    run(News(title=title, tags=tags.split(","), published=True).insert())


@given(parsers.parse('the system stores exactly {count:d} users'))
def given_exact_user_count(run, context, count):
    for i in range(count):
        _seed_user(run, context, f"seed_user_{i}", role="common")


# --------------------------------------------------------------------------- #
# When
# --------------------------------------------------------------------------- #
@when("the user requests the admin users list", target_fixture="context")
def when_user_requests_list(client, context):
    context["response"] = client.get("/admin/users", headers=context["headers"])
    return context


@when(
    parsers.parse(
        'the admin creates a user with username "{username}", email "{email}" and role "{role}"'
    ),
    target_fixture="context",
)
@when(
    parsers.parse(
        'the superadmin creates a user with username "{username}", email "{email}" and role "{role}"'
    ),
    target_fixture="context",
)
@when(
    parsers.parse(
        '"{caller}" creates a user with username "{username}", email "{email}" and role "{role}"'
    ),
    target_fixture="context",
)
def when_create_user(client, context, username, email, role, caller=None):
    context["response"] = client.post(
        "/admin/users",
        headers=context["headers"],
        json={"username": username, "email": email, "password": "secret123", "role": role},
    )
    return context


@when(
    parsers.parse('"{caller}" requests permanent deletion of "{target}"'),
    target_fixture="context",
)
def when_request_deletion(client, context, caller, target):
    user_id = context["ids"][target]
    context["response"] = client.delete(f"/admin/users/{user_id}", headers=context["headers"])
    return context


@when(parsers.parse('the admin permanently deletes "{target}"'), target_fixture="context")
def when_admin_deletes(client, context, target):
    user_id = context["ids"][target]
    context["response"] = client.delete(f"/admin/users/{user_id}", headers=context["headers"])
    assert context["response"].status_code == 200
    return context


@when(parsers.parse('the admin updates "{target}" email to "{email}"'), target_fixture="context")
def when_update_email(client, context, target, email):
    user_id = context["ids"][target]
    context["response"] = client.put(
        f"/admin/users/{user_id}", headers=context["headers"], json={"email": email}
    )
    assert context["response"].status_code == 200
    return context


@when(parsers.parse('the admin bans "{target}" with reason "{reason}"'), target_fixture="context")
def when_ban(client, context, target, reason):
    user_id = context["ids"][target]
    context["response"] = client.post(
        f"/admin/users/{user_id}/ban", headers=context["headers"], json={"reason": reason}
    )
    assert context["response"].status_code == 200
    return context


@when(parsers.parse('the admin unbans "{target}"'), target_fixture="context")
def when_unban(client, context, target):
    user_id = context["ids"][target]
    context["response"] = client.post(
        f"/admin/users/{user_id}/unban", headers=context["headers"]
    )
    assert context["response"].status_code == 200
    return context


@when(
    parsers.parse('the admin registers the contributor "{name}" with role "{role}"'),
    target_fixture="context",
)
def when_register_contributor(client, context, name, role):
    context["response"] = client.post(
        "/admin/artists", headers=context["headers"], json={"name": name, "role": role}
    )
    assert context["response"].status_code == 201
    return context


@when(
    parsers.re(
        r'the admin registers a contributor with name "(?P<name>[^"]*)" and role "(?P<role>[^"]+)"'
    ),
    target_fixture="context",
)
def when_register_contributor_named(client, context, name, role):
    context["response"] = client.post(
        "/admin/artists", headers=context["headers"], json={"name": name, "role": role}
    )
    return context


@when(parsers.parse('the admin searches catalog contributors by the term "{term}"'),
      target_fixture="context")
def when_search(client, context, term):
    context["response"] = client.get(
        "/admin/artists", headers=context["headers"], params={"q": term}
    )
    return context


@when(
    parsers.parse('the admin creates a news post titled "{title}" with body "{body}"'),
    target_fixture="context",
)
def when_create_news_compose(context, title, body):
    context["pending_news"] = {"title": title, "body": body, "tags": []}
    return context


@when(parsers.parse('the admin sets the news tags to "{tags}"'), target_fixture="context")
def when_set_news_tags(client, context, tags):
    payload = context["pending_news"]
    payload["tags"] = tags.split(",")
    context["response"] = client.post("/admin/news", headers=context["headers"], json=payload)
    assert context["response"].status_code == 201
    return context


@when("an unauthenticated visitor requests the public news feed", target_fixture="context")
def when_public_news(client, context):
    context["response"] = client.get("/news")
    return context


@when("the admin requests the admin users list twice", target_fixture="context")
def when_list_twice(client, context):
    client.get("/admin/users", headers=context["headers"])
    context["response"] = client.get("/admin/users", headers=context["headers"])
    return context


@when(
    parsers.parse(
        'the admin requests the audit log filtered by actor "{actor}" and action "{action}"'
    ),
    target_fixture="context",
)
def when_query_audit(client, context, actor, action):
    context["response"] = client.get(
        "/admin/audit-log", headers=context["headers"], params={"actor": actor, "action": action}
    )
    return context


# --------------------------------------------------------------------------- #
# Then
# --------------------------------------------------------------------------- #
@then("the system returns a forbidden access error")
def then_forbidden(context):
    assert context["response"].status_code == 403


@then("no admin user data is returned")
def then_no_admin_data(context):
    assert "data" not in context["response"].json()


@then(parsers.parse('the system persists the user "{username}" with role "{role}"'))
def then_user_persisted(run, username, role):
    user = run(User.find_one(User.username == username))
    assert user is not None
    assert user.role == role


@then(parsers.parse('the audit log records "{action}" by "{actor}"'))
def then_audit_records(run, action, actor):
    from app.db.models import AuditLog

    entry = run(AuditLog.find_one(AuditLog.action == action, AuditLog.actor == actor))
    assert entry is not None, f"expected audit entry {action} by {actor}"


@then(parsers.parse('"{username}" remains active with role "{role}"'))
def then_user_remains(run, username, role):
    user = run(User.find_one(User.username == username))
    assert user is not None
    assert user.status == "active"
    assert user.role == role


@then(parsers.parse('no related records for "{username}" are deleted'))
def then_no_records_deleted(run, username):
    assert run(User.find_one(User.username == username)) is not None


@then(parsers.parse('the user "{username}" is removed'))
def then_user_removed(run, username):
    assert run(User.find_one(User.username == username)) is None


@then(parsers.parse('"{username}" has email "{email}"'))
def then_user_has_email(run, username, email):
    user = run(User.find_one(User.username == username))
    assert user is not None and user.email == email


@then(parsers.parse('the audit log entry stores old email "{old}" and new email "{new}"'))
def then_audit_email_change(run, old, new):
    from app.db.models import AuditLog

    entry = run(AuditLog.find_one(AuditLog.action == "update_user"))
    assert entry is not None
    assert entry.metadata.get("old_email") == old
    assert entry.metadata.get("new_email") == new


@then(parsers.parse('"{username}" has status "{status}"'))
def then_user_status(run, username, status):
    user = run(User.find_one(User.username == username))
    assert user is not None and user.status == status


@then(parsers.parse('the post "{title}" is hidden from the public posts feed'))
def then_post_hidden(client, title):
    titles = [p["title"] for p in client.get("/posts").json()["data"]]
    assert title not in titles


@then(parsers.parse('the post "{title}" remains stored for moderation history'))
def then_post_still_stored(run, title):
    assert run(Post.find_one(Post.title == title)) is not None


@then(parsers.parse('the post "{title}" is visible in the public posts feed'))
def then_post_visible(client, title):
    titles = [p["title"] for p in client.get("/posts").json()["data"]]
    assert title in titles


@then(parsers.parse('the post "{title}" is removed'))
def then_post_removed(run, title):
    assert run(Post.find_one(Post.title == title)) is None


@then(parsers.parse('the comment "{content}" is removed'))
def then_comment_removed(run, content):
    assert run(Comment.find_one(Comment.content == content)) is None


@then(parsers.parse('the catalog stores "{name}" with role "{role}"'))
def then_catalog_stores(run, name, role):
    c = run(CatalogContributor.find_one(CatalogContributor.name == name))
    assert c is not None and c.role == role


@then(parsers.parse('the system returns the validation error "{message}"'))
def then_validation_error(context, message):
    assert context["response"].status_code == 400
    assert context["response"].json()["detail"] == message


@then("no contributor with an empty name is stored in the catalog")
def then_no_empty_contributor_stored(run):
    assert run(CatalogContributor.find_one(CatalogContributor.name == "")) is None


@then(parsers.parse('no audit log entry for action "{action}" by "{actor}" is created'))
def then_no_audit_entry(run, action, actor):
    from app.db.models import AuditLog

    entry = run(AuditLog.find_one(AuditLog.action == action, AuditLog.actor == actor))
    assert entry is None


@then(parsers.parse('the search results include "{name}"'))
def then_results_include(context, name):
    names = [c["name"] for c in context["response"].json()["data"]]
    assert name in names


@then(parsers.parse('the search results do not include "{name}"'))
def then_results_exclude(context, name):
    names = [c["name"] for c in context["response"].json()["data"]]
    assert name not in names


@then(parsers.parse('the news post "{title}" is stored with tags "{tags}"'))
def then_news_stored(run, title, tags):
    news = run(News.find_one(News.title == title))
    assert news is not None
    assert news.tags == tags.split(",")


@then(parsers.parse('the public news feed includes "{title}"'))
def then_public_news_includes(context, title):
    titles = [n["title"] for n in context["response"].json()["data"]]
    assert title in titles


@then(parsers.parse('the news tags "{tags}" are visible to the visitor'))
def then_news_tags_visible(context, tags):
    feed = context["response"].json()["data"]
    entry = next(n for n in feed if n["tags"])
    assert entry["tags"] == tags.split(",")


@then(parsers.parse('the system still stores exactly {count:d} users'))
def then_still_exact_count(run, count):
    users = run(User.find_all().to_list())
    assert len(users) == count


@then("no audit log entry is created for the listing")
def then_no_audit_for_listing(run):
    from app.db.models import AuditLog

    assert run(AuditLog.find_all().to_list()) == []


@then(parsers.parse('the audit log contains an entry for "{name}"'))
def then_audit_contains_entry(context, name):
    targets = [e["target"] for e in context["response"].json()["data"]]
    assert name in targets


@then(parsers.parse(
    'the entry stores the actor "{actor}", action "{action}" and target type "{target_type}"'
))
def then_entry_stores(context, actor, action, target_type):
    data = context["response"].json()["data"]
    assert any(
        e["actor"] == actor and e["action"] == action and e["target_type"] == target_type
        for e in data
    )
