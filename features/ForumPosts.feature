Scenario: Exclusao de post por moderador
Given estou logado como "moderador"
And existe o post "Review Ratatouille"
When eu tento excluir o post "Review Ratatouille"
Then eu vejo uma mensagem de confirmacao de exclusao
And eu vejo que o post "Review Ratatouille" foi removido