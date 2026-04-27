Scenario: Exclusao de post por moderador
Given estou logado como "moderador"
And existe o post "Review Ratatouille"
When eu tento excluir o post "Review Ratatouille"
Then eu vejo uma mensagem de confirmacao de exclusao
And eu vejo que o post "Review Ratatouille" foi removido


Scenario: Postagem com sucesso
Given estou logado como o usuário "Pedro123"
When eu seleciono para criar um novo post
And eu preencho o título com "Review Ratatouille"
And eu preencho o campo de conteudo do post
And eu seleciono a categoria "Filmes"
And eu seleciono para publicar
Then eu vejo meu post "Review Ratatouille" publicado com sucesso


Scenario: Falha ao criar post sem titulo
Given estou logado como o usuário "Pedro123"
When eu seleciono para criar um novo post
And eu deixo o campo de título em branco
And eu preencho o campo de conteudo do post
And eu seleciono a categoria "Filmes"
And eu seleciono para publicar
Then eu vejo uma mensagem de erro indicando que o título é obrigatório
And eu vejo que o post não foi publicado
And eu vejo que os campos que foram preenchidos permanecem com os dados correspondentes


Scenario: Exclusao de post por usuário
Given estou logado como o usuário "Pedro123"
And existe o post "Review Ratatouille" postado por "Pedro123"
When eu tento excluir o post "Review Ratatouille"
Then eu vejo uma que o post foi excluido com sucesso
