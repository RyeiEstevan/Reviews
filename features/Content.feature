Scenario: impedir cadastro duplicado de conteúdo:
Given eu acesso o sistema como "moderador" e estou na página de conteúdo 
And o sistema já tem um conteúdo "Matrix" com ano "1999"     
And o sistema tem um conteúdo "Duna" com ano "2021"    
When eu tento cadastrar o conteúdo "Matrix" com ano "1999"    
Then o sistema retorna uma mensagem de erro sobre duplicidade de conteúdo     
And o sistema continua tendo apenas um conteúdo "Matrix" com ano "1999"    
And o sistema mantém o conteúdo "Duna" com ano "2021"

Scenario: impedir que usuário comum remova conteúdo
Given eu acesso o sistema como "usuário comum" na página de conteúdo
And o sistema tem um conteúdo "Matrix" com o ano "1999"
When eu tento remover o conteúdo "Matrix"
Then o sistema retorna uma mensagem de erro sobre permissão insuficiente
And o sistema mantém o conteúdo "Matrix" com o ano "1999"

Scenario: impedir cadastro de conteúdo com duração inválida
Given eu acesso o sistema como "moderador" e estou na página de cadastrar conteúdo
When eu tento cadastrar o conteúdo "Avatar" com a duração "-120 min"
Then o sistema retorna uma mensagem de erro sobre formato de dados inválido
And o sistema não realiza o cadastro do conteúdo "Avatar"

Scenario: cadastrar novo conteúdo com sucesso
Given eu acesso o sistema como "moderador" 
And eu visualizo o formulário de cadastro de novo item 
When eu preencho o campos de título com o nome "Matrix"
And gênero com o nome "ficção científica" 
And ano de lançamento com o ano "1999"
And duração como "120 min" 
And eu clico no botão "Salvar"
Then o sistema deve confirmar o salvamento dos dados com sucesso
And o novo conteúdo deve passar a ser listado no catálogo geral do sistema

Scenario: publicação de review com sucesso
Given eu acesso o sistema como "usuário comum" e estou na página de detalhes do filme "Matrix".
When eu seleciono a nota "5" na escala de estrelas e escrevo "Um clássico absoluto!" no campo de comentário
And eu clico no botão "Enviar".
Then o sistema deve exibir uma mensagem de confirmação: "Sua review foi publicada com sucesso!"
And o meu comentário deve aparecer instantaneamente no topo da lista de comentários do filme.

Scenario: tentativa de envio de review vazia
Given que eu estou na seção de reviews do livro "O Caminho dos Reis"
When eu tento clicar em "Enviar" sem ter selecionado uma nota e escrito um texto
Then o sistema deve destacar o campo de texto e a escala de notas em vermelho
And exibir a mensagem de erro: "Por favor, preencha a nota e o comentário antes de enviar"
