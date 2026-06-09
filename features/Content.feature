# features/Content.feature
Feature: Gerenciamento de Conteúdo do Catálogo

  Background:
    Given o sistema está inicializado

  # ──────────────────────────────────────────────────────────
  # Cadastro com sucesso
  # ──────────────────────────────────────────────────────────
  Scenario: cadastrar novo conteúdo com sucesso
    Given eu acesso o sistema como "moderador"
    And eu visualizo o formulário de cadastro de novo item
    And eu preencho o campo de título com "Matrix"
    And o campo de gênero com "ficção científica"
    And o campo de ano de lançamento com "1999"
    And o campo de duração com "120 min"
    When eu clico no botão "Salvar"
    Then o sistema retorna status 201
    And o novo conteúdo aparece no catálogo com título "Matrix"

  # ──────────────────────────────────────────────────────────
  # Duplicidade
  # ──────────────────────────────────────────────────────────
  Scenario: impedir cadastro duplicado de conteúdo
    Given eu acesso o sistema como "moderador"
    And o sistema já tem um conteúdo "Matrix" com ano "1999"
    And o sistema tem um conteúdo "Duna" com ano "2021"
    When eu tento cadastrar o conteúdo "Matrix" com ano "1999"
    Then o sistema retorna uma mensagem de erro sobre duplicidade de conteúdo
    And o sistema continua tendo apenas um conteúdo "Matrix" com ano "1999"
    And o sistema mantém o conteúdo "Duna" com ano "2021"

  # ──────────────────────────────────────────────────────────
  # Permissão insuficiente para remoção
  # ──────────────────────────────────────────────────────────
  Scenario: impedir que usuário comum remova conteúdo
    Given eu acesso o sistema como "usuario_comum"
    And o sistema tem um conteúdo "Matrix" com o ano "1999"
    When eu tento remover o conteúdo "Matrix"
    Then o sistema retorna uma mensagem de erro sobre permissão insuficiente
    And o sistema mantém o conteúdo "Matrix" com o ano "1999"

  # ──────────────────────────────────────────────────────────
  # Duração inválida
  # ──────────────────────────────────────────────────────────
  Scenario: impedir cadastro de conteúdo com duração inválida
    Given eu acesso o sistema como "moderador"
    When eu tento cadastrar o conteúdo "Avatar" com a duração "-120 min"
    Then o sistema retorna uma mensagem de erro sobre formato de dados inválido
    And o sistema não realiza o cadastro do conteúdo "Avatar"

  # ──────────────────────────────────────────────────────────
  # Contador de visualizações
  # ──────────────────────────────────────────────────────────
  Scenario: incrementar contadores de visualização ao marcar como visto
    Given o sistema tem um conteúdo "Matrix" com ano "1999"
    When eu marco o conteúdo "Matrix" como visto
    Then o view_count do conteúdo "Matrix" é "1"
    And o recent_view_count do conteúdo "Matrix" é "1"