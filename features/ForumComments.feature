Scenario: Comentar em um post com sucesso
Given estou logado como o usuário "Maria321"
And existe o post "Review Ratatouille" postado por "Pedro123"
When eu seleciono para comentar no post "Review Ratatouille"
And eu preencho o campo de comentário com "Legal!"
And eu seleciono para publicar o comentário
Then eu vejo meu comentário "Legal!" publicado com sucesso
And eu vejo que o comentário está associado ao post "Review Ratatouille"


Scenario: Falha ao comentar sem conteúdo
Given estou logado como o usuário "Maria321"
And existe o post "Review Ratatouille" postado por "Pedro123"
When eu seleciono para comentar no post "Review Ratatouille"        
And eu deixo o campo de comentário vazio
And eu seleciono para publicar o comentário
Then eu vejo uma mensagem de erro indicando que o comentário não pode estar vazio
And eu vejo que o comentário não foi publicado
   

Scenario: Exclusão de comentário por moderador
Given estou logado como "moderador"
And existe o comentário "Chato!" associado ao post "Review Ratatouille"
When eu tento excluir o comentário "Chato!"
Then eu vejo uma mensagem de confirmação de exclusão    
And eu vejo que o comentário "Chato!" foi removido do post "Review Ratatouille"  
