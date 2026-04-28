Scenario: Filtrar posts por categoria
Given estou logado como o usuário "Pedro123"
And existem apenas os posts "Review Ratatouille" na categoria "Filmes" e "Tudo sobre Friends" na categoria "Séries"
When eu seleciono a categoria "Filmes" para filtrar os posts
Then eu vejo apenas o post "Review Ratatouille" listado
And eu não vejo o post "Tudo sobre Friends" listado   


Scenario: Categoria sem posts
Given estou logado como o usuário "Pedro123"
And existem apenas os posts "Review Ratatouille" na categoria "Filmes" e "Tudo sobre Friends" na categoria "Séries"
When eu seleciono a categoria "Livros" para filtrar os posts
Then eu vejo uma mensagem indicando que não há posts disponíveis nessa categoria
And eu não vejo nenhum post listado 
