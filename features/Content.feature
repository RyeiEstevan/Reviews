Scenario: impedir cadastro duplicado de conteúdo:
Given eu acesso o sistema como "moderador" 
And o sistema já tem um conteúdo "Matrix" com ano "1999"     
And o sistema tem um conteúdo "Duna" com ano "2021"    
When eu tento cadastrar o conteúdo "Matrix" com ano "1999"    
Then o servidor retorna uma mensagem de erro sobre duplicidade de conteúdo     
And o sistema continua tendo apenas um conteúdo "Matrix" com ano "1999"    
And o sistema mantém o conteúdo "Duna" com ano "2021"

Scenario: impedir que usuário comum remova conteúdo
Given eu acesso o sistema como "usuário comum"
And o sistema tem um conteúdo "Matrix" com o ano "1999"
When eu tento remover o conteúdo "Matrix"
Then o servidor retorna uma mensagem de erro sobre permissão insuficiente
And o sistema mantém o conteúdo "Matrix" com o ano "1999"

Scenario: impedir cadastro de conteúdo com duração inválida
Given eu acesso o sistema como "moderador"
When eu tento cadastrar o conteúdo "Avatar" com a duração "-120 min"
Then o servidor retorna uma mensagem de erro sobre formato de dados inválido
And o sistema não realiza o cadastro do conteúdo "Avatar"
And (só para completar a atividade 7)
