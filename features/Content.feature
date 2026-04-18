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

Scenario: cadastrar novo item de entretenimento com sucesso
Given eu acesso o sistema com um usuário que possui permissão de moderador 
And eu visualizo o formulário de cadastro de novo item 
When eu preencho os campos de título, gênero, ano de lançamento e duração 
And eu clico no botão "Salvar"
Then o sistema deve confirmar o salvamento dos dados com sucesso
And o novo conteúdo deve passar a ser listado no catálogo geral do sistema

teste 3