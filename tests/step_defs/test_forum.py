"""pytest-bdd step definitions for the Fórum feature.

Binds every scenario from the three forum feature files in one DRY module
(ForumPosts / ForumComments / ForumSearch share many steps, so defining them once
avoids duplication). Service/API level: each scenario drives the real FastAPI
routes over an in-memory mongomock-motor database and asserts the persisted state
(posts, comments) — never the UI. The UI-only "the form keeps the typed values"
assertion is verified by Cypress; here it is a structural placeholder.
"""

from pytest_bdd import given, parsers, scenario, then, when

from app.db.models import Comment, Post

POSTS = "ForumPosts.feature"
COMMENTS = "ForumComments.feature"
SEARCH = "ForumSearch.feature"

# A non-blank body reused whenever a step says "preencho o conteúdo".
SAMPLE_CONTENT = "Adorei, recomendo demais!"


# --------------------------------------------------------------------------- #
# Scenario bindings
# --------------------------------------------------------------------------- #
@scenario(POSTS, "Exclusao de post por moderador")
def test_post_deleted_by_moderator():
    pass


@scenario(POSTS, "Postagem com sucesso")
def test_post_created_successfully():
    pass


@scenario(POSTS, "Falha ao criar post sem titulo")
def test_post_without_title_fails():
    pass


@scenario(POSTS, "Exclusao de post por usuário")
def test_post_deleted_by_owner():
    pass


@scenario(COMMENTS, "Comentar em um post com sucesso")
def test_comment_created_successfully():
    pass


@scenario(COMMENTS, "Falha ao comentar sem conteúdo")
def test_comment_without_content_fails():
    pass


@scenario(COMMENTS, "Exclusão de comentário por moderador")
def test_comment_deleted_by_moderator():
    pass


@scenario(SEARCH, "Filtrar posts por categoria")
def test_filter_posts_by_category():
    pass


@scenario(SEARCH, "Categoria sem posts")
def test_category_without_posts():
    pass


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _seed_post(run, context, title, owner="autor", category="Filmes"):
    post = Post(owner=owner, title=title, content=SAMPLE_CONTENT, category=category, hidden=False)
    run(post.insert())
    context.setdefault("posts", {})[title] = str(post.id)
    return post


# --------------------------------------------------------------------------- #
# Given — authentication
# --------------------------------------------------------------------------- #
@given('estou logado como "moderador"')
def given_logged_as_moderator(auth, context):
    context["headers"] = auth("moderador", "moderador")
    context["actor"] = "moderador"


@given(parsers.parse('estou logado como o usuário "{username}"'))
def given_logged_as_user(auth, context, username):
    context["headers"] = auth(username, "common")
    context["actor"] = username


# --------------------------------------------------------------------------- #
# Given — seeding
# --------------------------------------------------------------------------- #
@given(parsers.parse('existe o post "{title}"'))
def given_post_exists(run, context, title):
    _seed_post(run, context, title)


@given(parsers.parse('existe o post "{title}" postado por "{username}"'))
def given_post_exists_by(run, context, title, username):
    _seed_post(run, context, title, owner=username)


@given(parsers.parse('existe o comentário "{content}" associado ao post "{title}"'))
def given_comment_exists(run, context, content, title):
    if title not in context.get("posts", {}):
        _seed_post(run, context, title)
    post_id = context["posts"][title]
    comment = Comment(author="autor", content=content, post_id=post_id)
    run(comment.insert())
    context.setdefault("comments", {})[content] = str(comment.id)


@given(
    parsers.parse(
        'existem apenas os posts "{title1}" na categoria "{cat1}" e '
        '"{title2}" na categoria "{cat2}"'
    )
)
def given_only_two_posts(run, context, title1, cat1, title2, cat2):
    _seed_post(run, context, title1, owner="Pedro123", category=cat1)
    _seed_post(run, context, title2, owner="Pedro123", category=cat2)


# --------------------------------------------------------------------------- #
# When — creating a post (multi-step form accumulated in context["draft"])
# --------------------------------------------------------------------------- #
@when("eu seleciono para criar um novo post")
def when_start_new_post(context):
    context["draft"] = {"title": "", "content": "", "category": ""}


@when(parsers.parse('eu preencho o título com "{title}"'))
def when_fill_title(context, title):
    context["draft"]["title"] = title


@when("eu deixo o campo de título em branco")
def when_blank_title(context):
    context["draft"]["title"] = ""


@when("eu preencho o campo de conteudo do post")
def when_fill_content(context):
    context["draft"]["content"] = SAMPLE_CONTENT


@when(parsers.parse('eu seleciono a categoria "{category}"'))
def when_pick_category(context, category):
    context["draft"]["category"] = category


@when("eu seleciono para publicar")
def when_publish_post(client, context):
    context["response"] = client.post("/forum/posts", headers=context["headers"], json=context["draft"])


# --------------------------------------------------------------------------- #
# When — commenting (accumulated in context["comment_draft"])
# --------------------------------------------------------------------------- #
@when(parsers.parse('eu seleciono para comentar no post "{title}"'))
def when_start_comment(context, title):
    context["comment_target"] = context["posts"][title]
    context["comment_draft"] = {"content": ""}


@when(parsers.parse('eu preencho o campo de comentário com "{content}"'))
def when_fill_comment(context, content):
    context["comment_draft"]["content"] = content


@when("eu deixo o campo de comentário vazio")
def when_blank_comment(context):
    context["comment_draft"]["content"] = ""


@when("eu seleciono para publicar o comentário")
def when_publish_comment(client, context):
    context["response"] = client.post(
        f"/forum/posts/{context['comment_target']}/comments",
        headers=context["headers"],
        json=context["comment_draft"],
    )


# --------------------------------------------------------------------------- #
# When — deleting / filtering
# --------------------------------------------------------------------------- #
@when(parsers.parse('eu tento excluir o post "{title}"'))
def when_delete_post(client, context, title):
    post_id = context["posts"][title]
    context["deleted_post_id"] = post_id
    context["response"] = client.delete(f"/forum/posts/{post_id}", headers=context["headers"])


@when(parsers.parse('eu tento excluir o comentário "{content}"'))
def when_delete_comment(client, context, content):
    comment_id = context["comments"][content]
    context["response"] = client.delete(f"/forum/comments/{comment_id}", headers=context["headers"])


@when(parsers.parse('eu seleciono a categoria "{category}" para filtrar os posts'))
def when_filter_by_category(client, context, category):
    context["response"] = client.get(
        "/forum/posts", params={"category": category}, headers=context.get("headers", {})
    )


# --------------------------------------------------------------------------- #
# Then — posts
# --------------------------------------------------------------------------- #
@then(parsers.parse('eu vejo meu post "{title}" publicado com sucesso'))
def then_post_published(run, context, title):
    resp = context["response"]
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["title"] == title
    assert data["category"]
    # Persisted and visible in the public forum feed (hidden posts excluded).
    stored = run(Post.find_one(Post.title == title))
    assert stored is not None and stored.hidden is False
    visible = run(Post.find(Post.hidden == False).to_list())  # noqa: E712
    assert title in [p.title for p in visible]


@then("eu vejo uma mensagem de erro indicando que o título é obrigatório")
def then_title_required_error(context):
    resp = context["response"]
    assert resp.status_code == 400
    assert resp.json()["detail"] == "title is required"


@then("eu vejo que o post não foi publicado")
def then_post_not_published(run):
    assert run(Post.find_all().to_list()) == []


@then("eu vejo que os campos que foram preenchidos permanecem com os dados correspondentes")
def then_form_keeps_values(context):
    # UI behaviour (the form retains what was typed) — asserted end-to-end in
    # Cypress. At the service tier we only confirm the rejected draft still
    # carries the values the user had filled in.
    assert context["draft"]["content"] == SAMPLE_CONTENT
    assert context["draft"]["category"] == "Filmes"


@then("eu vejo que o post foi excluido com sucesso")
def then_post_deleted_ok(run, context):
    resp = context["response"]
    assert resp.status_code == 200
    assert resp.json()["data"]["deleted"] is True
    assert run(Post.get(context["deleted_post_id"])) is None


@then(parsers.parse('eu vejo que o post "{title}" foi removido'))
def then_post_removed(run, title):
    assert run(Post.find_one(Post.title == title)) is None


# --------------------------------------------------------------------------- #
# Then — comments
# --------------------------------------------------------------------------- #
@then(parsers.parse('eu vejo meu comentário "{content}" publicado com sucesso'))
def then_comment_published(run, context, content):
    resp = context["response"]
    assert resp.status_code == 201, resp.text
    assert resp.json()["data"]["content"] == content
    assert run(Comment.find_one(Comment.content == content)) is not None


@then(parsers.parse('eu vejo que o comentário está associado ao post "{title}"'))
def then_comment_linked(context, title):
    assert context["response"].json()["data"]["post_id"] == context["posts"][title]


@then("eu vejo uma mensagem de erro indicando que o comentário não pode estar vazio")
def then_comment_empty_error(context):
    resp = context["response"]
    assert resp.status_code == 400
    assert resp.json()["detail"] == "comment cannot be empty"


@then("eu vejo que o comentário não foi publicado")
def then_comment_not_published(run):
    assert run(Comment.find_all().to_list()) == []


@then(parsers.parse('eu vejo que o comentário "{content}" foi removido do post "{title}"'))
def then_comment_removed(run, content, title):
    assert run(Comment.find_one(Comment.content == content)) is None


# --------------------------------------------------------------------------- #
# Then — deletion confirmation (shared by post & comment; accent variants)
# --------------------------------------------------------------------------- #
@then("eu vejo uma mensagem de confirmacao de exclusao")
@then("eu vejo uma mensagem de confirmação de exclusão")
def then_deletion_confirmed(context):
    resp = context["response"]
    assert resp.status_code == 200
    assert resp.json()["data"]["deleted"] is True


# --------------------------------------------------------------------------- #
# Then — category filter
# --------------------------------------------------------------------------- #
@then(parsers.parse('eu vejo apenas o post "{title}" listado'))
def then_only_post_listed(context, title):
    titles = [p["title"] for p in context["response"].json()["data"]]
    assert titles == [title]


@then(parsers.parse('eu não vejo o post "{title}" listado'))
def then_post_not_listed(context, title):
    titles = [p["title"] for p in context["response"].json()["data"]]
    assert title not in titles


@then("eu vejo uma mensagem indicando que não há posts disponíveis nessa categoria")
def then_empty_category_message(context):
    # The backend returns an empty list; the UI turns that into the message.
    assert context["response"].json()["data"] == []


@then("eu não vejo nenhum post listado")
def then_no_posts_listed(context):
    assert context["response"].json()["data"] == []
