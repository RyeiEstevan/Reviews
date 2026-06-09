# features/Content.feature
Feature: Gerenciamento de Mídia do Catálogo

  Background:
    Given o sistema está inicializado

  # ──────────────────────────────────────────────────────────
  # Cadastro com sucesso
  # ──────────────────────────────────────────────────────────
  Scenario: cadastrar nova mídia com sucesso
    Given eu acesso o sistema como "moderador"
    When eu cadastro uma mídia com título "Fallout" do tipo "series" do ano "2024"
    Then o sistema retorna status 201
    And a mídia "Fallout" aparece no catálogo

  # ──────────────────────────────────────────────────────────
  # Listagem
  # ──────────────────────────────────────────────────────────
  Scenario: listar mídias cadastradas
    Given o sistema tem uma mídia "Matrix" do tipo "movie" do ano "1999"
    And o sistema tem uma mídia "Duna" do tipo "movie" do ano "2021"
    When eu listo as mídias
    Then o sistema retorna status 200
    And o catálogo contém "Matrix"
    And o catálogo contém "Duna"

  # ──────────────────────────────────────────────────────────
  # Filtro por tipo
  # ──────────────────────────────────────────────────────────
  Scenario: filtrar mídias por tipo
    Given o sistema tem uma mídia "Matrix" do tipo "movie" do ano "1999"
    And o sistema tem uma mídia "Fundação" do tipo "series" do ano "2021"
    When eu listo as mídias com filtro de tipo "movie"
    Then o sistema retorna status 200
    And o catálogo contém "Matrix"
    And o catálogo não contém "Fundação"

  # ──────────────────────────────────────────────────────────
  # Permissão insuficiente para cadastro
  # ──────────────────────────────────────────────────────────
  Scenario: impedir cadastro de mídia por usuário sem permissão
    Given eu acesso o sistema como "usuario_comum"
    When eu cadastro uma mídia com título "Avatar" do tipo "movie" do ano "2009"
    Then o sistema retorna status 403

  # ──────────────────────────────────────────────────────────
  # Atualização
  # ──────────────────────────────────────────────────────────
  Scenario: atualizar título de uma mídia com sucesso
    Given eu acesso o sistema como "moderador"
    And o sistema tem uma mídia "Matrix" do tipo "movie" do ano "1999"
    When eu atualizo o título da mídia "Matrix" para "Matrix Reloaded"
    Then o sistema retorna status 200
    And a mídia "Matrix Reloaded" aparece no catálogo

  # ──────────────────────────────────────────────────────────
  # Remoção com sucesso
  # ──────────────────────────────────────────────────────────
  Scenario: remover mídia com sucesso
    Given eu acesso o sistema como "moderador"
    And o sistema tem uma mídia "Matrix" do tipo "movie" do ano "1999"
    When eu removo a mídia "Matrix"
    Then o sistema retorna status 204
    And o catálogo não contém "Matrix"

  # ──────────────────────────────────────────────────────────
  # Permissão insuficiente para remoção
  # ──────────────────────────────────────────────────────────
  Scenario: impedir remoção de mídia por usuário sem permissão
    Given eu acesso o sistema como "usuario_comum"
    And o sistema tem uma mídia "Matrix" do tipo "movie" do ano "1999"
    When eu removo a mídia "Matrix"
    Then o sistema retorna status 403
    And o catálogo contém "Matrix"
