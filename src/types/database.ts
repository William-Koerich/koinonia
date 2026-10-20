
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "athletes": {
                  Row: {
                    "age": number | null,"bib_number": number,"created_at": string,"id": string,"name": string,"race_id": string,"sex": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age"?: number | null,"bib_number": number,"created_at"?: string,"id"?: string,"name": string,"race_id": string,"sex": string,"updated_at"?: string
                  }
                  Update: {
                    "age"?: number | null,"bib_number"?: number,"created_at"?: string,"id"?: string,"name"?: string,"race_id"?: string,"sex"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "athletes_race_id_fkey"
      columns: ["race_id"]
isOneToOne: false
      referencedRelation: "races"
      referencedColumns: ["id"]
    }
                  ]
                },"fertex_geo_coordenadas": {
                  Row: {
                    "atualizado_em": string,"bairro": string | null,"cidade": string | null,"lat": number,"lon": number,"pais_sigla": string | null,"request_id": number | null,"tentativas": number,"uf": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"bairro"?: string | null,"cidade"?: string | null,"lat": number,"lon": number,"pais_sigla"?: string | null,"request_id"?: number | null,"tentativas"?: number,"uf"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"bairro"?: string | null,"cidade"?: string | null,"lat"?: number,"lon"?: number,"pais_sigla"?: string | null,"request_id"?: number | null,"tentativas"?: number,"uf"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"fertex_ip_geo": {
                  Row: {
                    "asn": number | null,"asn_org": string | null,"atualizado_em": string,"cidade": string | null,"ip": string,"pais": string | null,"pais_sigla": string | null,"regiao": string | null,"regiao_sigla": string | null,"request_id": number | null,"robo": boolean,"tentativas": number
                  }
                  ComputedFields: never
                  Insert: {
                    "asn"?: number | null,"asn_org"?: string | null,"atualizado_em"?: string,"cidade"?: string | null,"ip": string,"pais"?: string | null,"pais_sigla"?: string | null,"regiao"?: string | null,"regiao_sigla"?: string | null,"request_id"?: number | null,"robo"?: boolean,"tentativas"?: number
                  }
                  Update: {
                    "asn"?: number | null,"asn_org"?: string | null,"atualizado_em"?: string,"cidade"?: string | null,"ip"?: string,"pais"?: string | null,"pais_sigla"?: string | null,"regiao"?: string | null,"regiao_sigla"?: string | null,"request_id"?: number | null,"robo"?: boolean,"tentativas"?: number
                  }
                  Relationships: [
                    
                  ]
                },"fertex_itens_custos": {
                  Row: {
                    "comissao_percentual": number | null,"custo_unitario": number | null,"item_id": string,"tipo_ganho": Database["public"]['Enums']["fertex_tipo_ganho"]
                  }
                  ComputedFields: never
                  Insert: {
                    "comissao_percentual"?: number | null,"custo_unitario"?: number | null,"item_id": string,"tipo_ganho": Database["public"]['Enums']["fertex_tipo_ganho"]
                  }
                  Update: {
                    "comissao_percentual"?: number | null,"custo_unitario"?: number | null,"item_id"?: string,"tipo_ganho"?: Database["public"]['Enums']["fertex_tipo_ganho"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "fertex_itens_custos_item_id_fertex_itens_pedido_id_fk"
      columns: ["item_id"]
isOneToOne: true
      referencedRelation: "fertex_itens_pedido"
      referencedColumns: ["id"]
    }
                  ]
                },"fertex_itens_pedido": {
                  Row: {
                    "cor": string | null,"id": string,"pedido_id": string,"preco_unitario": number,"produto_id": string,"quantidade": number,"unidade": Database["public"]['Enums']["fertex_unidade"],"vendedor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cor"?: string | null,"id"?: string,"pedido_id": string,"preco_unitario": number,"produto_id": string,"quantidade": number,"unidade"?: Database["public"]['Enums']["fertex_unidade"],"vendedor_id": string
                  }
                  Update: {
                    "cor"?: string | null,"id"?: string,"pedido_id"?: string,"preco_unitario"?: number,"produto_id"?: string,"quantidade"?: number,"unidade"?: Database["public"]['Enums']["fertex_unidade"],"vendedor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fertex_itens_pedido_pedido_id_fertex_pedidos_id_fk"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "fertex_pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fertex_itens_pedido_produto_id_fertex_produtos_id_fk"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "fertex_produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fertex_itens_pedido_vendedor_id_fertex_profiles_id_fk"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "fertex_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fertex_pedidos": {
                  Row: {
                    "cliente_nome": string | null,"comprador_id": string | null,"concluido_em": string | null,"criado_em": string,"forma_pagamento": Database["public"]['Enums']["fertex_forma_pagamento"] | null,"id": string,"observacao": string | null,"origem": Database["public"]['Enums']["fertex_origem_pedido"],"prazo_pagamento": string | null,"status": Database["public"]['Enums']["fertex_status_pedido"],"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_nome"?: string | null,"comprador_id"?: string | null,"concluido_em"?: string | null,"criado_em"?: string,"forma_pagamento"?: Database["public"]['Enums']["fertex_forma_pagamento"] | null,"id"?: string,"observacao"?: string | null,"origem"?: Database["public"]['Enums']["fertex_origem_pedido"],"prazo_pagamento"?: string | null,"status"?: Database["public"]['Enums']["fertex_status_pedido"],"total": number
                  }
                  Update: {
                    "cliente_nome"?: string | null,"comprador_id"?: string | null,"concluido_em"?: string | null,"criado_em"?: string,"forma_pagamento"?: Database["public"]['Enums']["fertex_forma_pagamento"] | null,"id"?: string,"observacao"?: string | null,"origem"?: Database["public"]['Enums']["fertex_origem_pedido"],"prazo_pagamento"?: string | null,"status"?: Database["public"]['Enums']["fertex_status_pedido"],"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "fertex_pedidos_comprador_id_fertex_profiles_id_fk"
      columns: ["comprador_id"]
isOneToOne: false
      referencedRelation: "fertex_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fertex_produtos": {
                  Row: {
                    "ativo": boolean,"categoria": string,"cores": (string)[],"criado_em": string,"descricao": string,"estoque": number,"excluido_em": string | null,"foto_url": string | null,"id": string,"nome": string,"preco": number,"quantidade_minima": number | null,"unidade": Database["public"]['Enums']["fertex_unidade"],"vendedor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"categoria": string,"cores"?: (string)[],"criado_em"?: string,"descricao"?: string,"estoque"?: number,"excluido_em"?: string | null,"foto_url"?: string | null,"id"?: string,"nome": string,"preco": number,"quantidade_minima"?: number | null,"unidade"?: Database["public"]['Enums']["fertex_unidade"],"vendedor_id": string
                  }
                  Update: {
                    "ativo"?: boolean,"categoria"?: string,"cores"?: (string)[],"criado_em"?: string,"descricao"?: string,"estoque"?: number,"excluido_em"?: string | null,"foto_url"?: string | null,"id"?: string,"nome"?: string,"preco"?: number,"quantidade_minima"?: number | null,"unidade"?: Database["public"]['Enums']["fertex_unidade"],"vendedor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fertex_produtos_vendedor_id_fertex_profiles_id_fk"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "fertex_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fertex_produtos_custos": {
                  Row: {
                    "atualizado_em": string,"comissao_percentual": number | null,"preco_custo": number | null,"produto_id": string,"tipo_ganho": Database["public"]['Enums']["fertex_tipo_ganho"]
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"comissao_percentual"?: number | null,"preco_custo"?: number | null,"produto_id": string,"tipo_ganho": Database["public"]['Enums']["fertex_tipo_ganho"]
                  }
                  Update: {
                    "atualizado_em"?: string,"comissao_percentual"?: number | null,"preco_custo"?: number | null,"produto_id"?: string,"tipo_ganho"?: Database["public"]['Enums']["fertex_tipo_ganho"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "fertex_produtos_custos_produto_id_fertex_produtos_id_fk"
      columns: ["produto_id"]
isOneToOne: true
      referencedRelation: "fertex_produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"fertex_profiles": {
                  Row: {
                    "criado_em": string,"id": string,"nome": string,"perfil": Database["public"]['Enums']["fertex_perfil"],"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"id": string,"nome": string,"perfil": Database["public"]['Enums']["fertex_perfil"],"whatsapp"?: string | null
                  }
                  Update: {
                    "criado_em"?: string,"id"?: string,"nome"?: string,"perfil"?: Database["public"]['Enums']["fertex_perfil"],"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"fertex_visitas": {
                  Row: {
                    "criado_em": string,"id": string,"ip": string | null,"lat": number | null,"lon": number | null,"origem": string,"precisao_m": number | null,"produto_id": string | null,"referrer": string | null,"vendedor_id": string | null,"visitante": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"id"?: string,"ip"?: string | null,"lat"?: number | null,"lon"?: number | null,"origem"?: string,"precisao_m"?: number | null,"produto_id"?: string | null,"referrer"?: string | null,"vendedor_id"?: string | null,"visitante"?: string | null
                  }
                  Update: {
                    "criado_em"?: string,"id"?: string,"ip"?: string | null,"lat"?: number | null,"lon"?: number | null,"origem"?: string,"precisao_m"?: number | null,"produto_id"?: string | null,"referrer"?: string | null,"vendedor_id"?: string | null,"visitante"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fertex_visitas_produto_id_fertex_produtos_id_fk"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "fertex_produtos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fertex_visitas_vendedor_id_fertex_profiles_id_fk"
      columns: ["vendedor_id"]
isOneToOne: false
      referencedRelation: "fertex_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"finishes": {
                  Row: {
                    "athlete_id": string | null,"client_id": string,"created_at": string,"device_id": string | null,"finish_time": string,"id": string,"race_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id"?: string | null,"client_id": string,"created_at"?: string,"device_id"?: string | null,"finish_time": string,"id"?: string,"race_id": string,"updated_at"?: string
                  }
                  Update: {
                    "athlete_id"?: string | null,"client_id"?: string,"created_at"?: string,"device_id"?: string | null,"finish_time"?: string,"id"?: string,"race_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "finishes_athlete_fk"
      columns: ["race_id","athlete_id"]
isOneToOne: false
      referencedRelation: "athletes"
      referencedColumns: ["race_id","id"]
    },{
      foreignKeyName: "finishes_race_id_fkey"
      columns: ["race_id"]
isOneToOne: false
      referencedRelation: "races"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_avisos": {
                  Row: {
                    "created_at": string,"created_by": string | null,"exibir_ate": string | null,"id": string,"imagem_path": string | null,"mensagem": string | null,"publico": boolean,"titulo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"exibir_ate"?: string | null,"id"?: string,"imagem_path"?: string | null,"mensagem"?: string | null,"publico"?: boolean,"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"exibir_ate"?: string | null,"id"?: string,"imagem_path"?: string | null,"mensagem"?: string | null,"publico"?: boolean,"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_avisos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_avisos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_cantina_escalas": {
                  Row: {
                    "created_at": string,"data": string,"descricao": string | null,"gc_id": string | null,"id": string,"ministerio_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data": string,"descricao"?: string | null,"gc_id"?: string | null,"id"?: string,"ministerio_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"data"?: string,"descricao"?: string | null,"gc_id"?: string | null,"id"?: string,"ministerio_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_cantina_escalas_gc_id_fkey"
      columns: ["gc_id"]
isOneToOne: false
      referencedRelation: "koinonia_gcs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_cantina_escalas_ministerio_id_fkey"
      columns: ["ministerio_id"]
isOneToOne: false
      referencedRelation: "koinonia_ministerios"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_cantina_itens": {
                  Row: {
                    "cantina_id": string,"created_at": string,"descricao": string | null,"id": string,"nome": string,"ordem": number,"preco": number | null,"quantidade_disponivel": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantina_id": string,"created_at"?: string,"descricao"?: string | null,"id"?: string,"nome": string,"ordem"?: number,"preco"?: number | null,"quantidade_disponivel"?: number | null
                  }
                  Update: {
                    "cantina_id"?: string,"created_at"?: string,"descricao"?: string | null,"id"?: string,"nome"?: string,"ordem"?: number,"preco"?: number | null,"quantidade_disponivel"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_cantina_itens_cantina_id_fkey"
      columns: ["cantina_id"]
isOneToOne: false
      referencedRelation: "koinonia_cantina_escalas"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_cantina_reservas": {
                  Row: {
                    "created_at": string,"id": string,"item_id": string,"modo": Database["public"]['Enums']["koinonia_cantina_modo"],"observacao": string | null,"profile_id": string,"quantidade": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"item_id": string,"modo": Database["public"]['Enums']["koinonia_cantina_modo"],"observacao"?: string | null,"profile_id": string,"quantidade": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"item_id"?: string,"modo"?: Database["public"]['Enums']["koinonia_cantina_modo"],"observacao"?: string | null,"profile_id"?: string,"quantidade"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_cantina_reservas_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "koinonia_cantina_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_cantina_reservas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_cantina_reservas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_configuracoes_contribuicao": {
                  Row: {
                    "agencia": string | null,"banco": string | null,"chave_pix": string | null,"cnpj": string | null,"conta": string | null,"id": boolean,"pix_cidade": string | null,"pix_recebedor": string | null,"tipo_chave": Database["public"]['Enums']["koinonia_tipo_chave_pix"] | null,"titular": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agencia"?: string | null,"banco"?: string | null,"chave_pix"?: string | null,"cnpj"?: string | null,"conta"?: string | null,"id"?: boolean,"pix_cidade"?: string | null,"pix_recebedor"?: string | null,"tipo_chave"?: Database["public"]['Enums']["koinonia_tipo_chave_pix"] | null,"titular"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "agencia"?: string | null,"banco"?: string | null,"chave_pix"?: string | null,"cnpj"?: string | null,"conta"?: string | null,"id"?: boolean,"pix_cidade"?: string | null,"pix_recebedor"?: string | null,"tipo_chave"?: Database["public"]['Enums']["koinonia_tipo_chave_pix"] | null,"titular"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"koinonia_escala_atribuicoes": {
                  Row: {
                    "created_at": string,"escala_id": string,"funcao_id": string,"id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"escala_id": string,"funcao_id": string,"id"?: string,"profile_id": string
                  }
                  Update: {
                    "created_at"?: string,"escala_id"?: string,"funcao_id"?: string,"id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_escala_atribuicoes_escala_id_fkey"
      columns: ["escala_id"]
isOneToOne: false
      referencedRelation: "koinonia_escalas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_escala_atribuicoes_funcao_id_fkey"
      columns: ["funcao_id"]
isOneToOne: false
      referencedRelation: "koinonia_escala_funcoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_escala_atribuicoes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_escala_atribuicoes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_escala_funcoes": {
                  Row: {
                    "ativo": boolean,"funcao": string,"id": string,"ordem": number,"vagas": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"funcao": string,"id"?: string,"ordem"?: number,"vagas": number
                  }
                  Update: {
                    "ativo"?: boolean,"funcao"?: string,"id"?: string,"ordem"?: number,"vagas"?: number
                  }
                  Relationships: [
                    
                  ]
                },"koinonia_escalas": {
                  Row: {
                    "created_at": string,"created_by": string | null,"data": string,"descricao": string,"evento_id": string | null,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"data": string,"descricao": string,"evento_id"?: string | null,"id"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"data"?: string,"descricao"?: string,"evento_id"?: string | null,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_escalas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_escalas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_escalas_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "koinonia_eventos"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_evento_inscricoes": {
                  Row: {
                    "adicionado_por": string | null,"convidado_celular": string | null,"convidado_nome": string | null,"created_at": string,"decidido_em": string | null,"decidido_por": string | null,"evento_id": string,"id": string,"observacao": string | null,"pagamento_informado_em": string | null,"profile_id": string | null,"status": Database["public"]['Enums']["koinonia_inscricao_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "adicionado_por"?: string | null,"convidado_celular"?: string | null,"convidado_nome"?: string | null,"created_at"?: string,"decidido_em"?: string | null,"decidido_por"?: string | null,"evento_id": string,"id"?: string,"observacao"?: string | null,"pagamento_informado_em"?: string | null,"profile_id"?: string | null,"status"?: Database["public"]['Enums']["koinonia_inscricao_status"]
                  }
                  Update: {
                    "adicionado_por"?: string | null,"convidado_celular"?: string | null,"convidado_nome"?: string | null,"created_at"?: string,"decidido_em"?: string | null,"decidido_por"?: string | null,"evento_id"?: string,"id"?: string,"observacao"?: string | null,"pagamento_informado_em"?: string | null,"profile_id"?: string | null,"status"?: Database["public"]['Enums']["koinonia_inscricao_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_evento_inscricoes_adicionado_por_fkey"
      columns: ["adicionado_por"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_evento_inscricoes_adicionado_por_fkey"
      columns: ["adicionado_por"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_evento_inscricoes_decidido_por_fkey"
      columns: ["decidido_por"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_evento_inscricoes_decidido_por_fkey"
      columns: ["decidido_por"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_evento_inscricoes_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "koinonia_eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_evento_inscricoes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_evento_inscricoes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_eventos": {
                  Row: {
                    "bairro": string,"cep": string,"cidade": string,"complemento": string | null,"created_at": string,"created_by": string | null,"descricao": string | null,"fim": string,"id": string,"inicio": string,"logradouro": string,"numero": string,"pix_chave": string | null,"pix_recebedor": string | null,"pix_tipo": Database["public"]['Enums']["koinonia_tipo_chave_pix"] | null,"publico": Database["public"]['Enums']["koinonia_publico_evento"],"responsavel_id": string,"titulo": string,"uf": string,"updated_at": string,"valor": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bairro": string,"cep": string,"cidade": string,"complemento"?: string | null,"created_at"?: string,"created_by"?: string | null,"descricao"?: string | null,"fim": string,"id"?: string,"inicio": string,"logradouro": string,"numero": string,"pix_chave"?: string | null,"pix_recebedor"?: string | null,"pix_tipo"?: Database["public"]['Enums']["koinonia_tipo_chave_pix"] | null,"publico"?: Database["public"]['Enums']["koinonia_publico_evento"],"responsavel_id": string,"titulo": string,"uf": string,"updated_at"?: string,"valor"?: number | null
                  }
                  Update: {
                    "bairro"?: string,"cep"?: string,"cidade"?: string,"complemento"?: string | null,"created_at"?: string,"created_by"?: string | null,"descricao"?: string | null,"fim"?: string,"id"?: string,"inicio"?: string,"logradouro"?: string,"numero"?: string,"pix_chave"?: string | null,"pix_recebedor"?: string | null,"pix_tipo"?: Database["public"]['Enums']["koinonia_tipo_chave_pix"] | null,"publico"?: Database["public"]['Enums']["koinonia_publico_evento"],"responsavel_id"?: string,"titulo"?: string,"uf"?: string,"updated_at"?: string,"valor"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_eventos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_eventos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_eventos_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_eventos_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_gcs": {
                  Row: {
                    "bairro": string,"cep": string,"cidade": string,"complemento": string | null,"created_at": string,"dia_semana": number | null,"horario": string | null,"id": string,"lider_id": string | null,"logradouro": string,"nome": string,"numero": string,"uf": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bairro": string,"cep": string,"cidade": string,"complemento"?: string | null,"created_at"?: string,"dia_semana"?: number | null,"horario"?: string | null,"id"?: string,"lider_id"?: string | null,"logradouro": string,"nome": string,"numero": string,"uf": string,"updated_at"?: string
                  }
                  Update: {
                    "bairro"?: string,"cep"?: string,"cidade"?: string,"complemento"?: string | null,"created_at"?: string,"dia_semana"?: number | null,"horario"?: string | null,"id"?: string,"lider_id"?: string | null,"logradouro"?: string,"nome"?: string,"numero"?: string,"uf"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_gcs_lider_id_fkey"
      columns: ["lider_id"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_gcs_lider_id_fkey"
      columns: ["lider_id"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_ministerio_membros": {
                  Row: {
                    "created_at": string,"is_lider": boolean,"ministerio_id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"is_lider"?: boolean,"ministerio_id": string,"profile_id": string
                  }
                  Update: {
                    "created_at"?: string,"is_lider"?: boolean,"ministerio_id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_ministerio_membros_ministerio_id_fkey"
      columns: ["ministerio_id"]
isOneToOne: false
      referencedRelation: "koinonia_ministerios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_ministerio_membros_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_ministerio_membros_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_ministerio_solicitacoes": {
                  Row: {
                    "created_at": string,"id": string,"ministerio_id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"ministerio_id": string,"profile_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"ministerio_id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_ministerio_solicitacoes_ministerio_id_fkey"
      columns: ["ministerio_id"]
isOneToOne: false
      referencedRelation: "koinonia_ministerios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_ministerio_solicitacoes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_perfis_basicos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "koinonia_ministerio_solicitacoes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "koinonia_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_ministerios": {
                  Row: {
                    "created_at": string,"descricao": string | null,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"descricao"?: string | null,"id"?: string,"nome": string
                  }
                  Update: {
                    "created_at"?: string,"descricao"?: string | null,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"koinonia_pastores": {
                  Row: {
                    "ativo": boolean,"bio": string | null,"cargo": string,"created_at": string,"foto_path": string | null,"id": string,"nome": string,"ordem": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"bio"?: string | null,"cargo": string,"created_at"?: string,"foto_path"?: string | null,"id"?: string,"nome": string,"ordem"?: number,"updated_at"?: string
                  }
                  Update: {
                    "ativo"?: boolean,"bio"?: string | null,"cargo"?: string,"created_at"?: string,"foto_path"?: string | null,"id"?: string,"nome"?: string,"ordem"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"koinonia_profiles": {
                  Row: {
                    "ativo": boolean,"celular": string,"created_at": string,"data_nascimento": string,"email": string,"gc_id": string | null,"genero": Database["public"]['Enums']["koinonia_genero"],"id": string,"nome_completo": string,"role": Database["public"]['Enums']["koinonia_user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"celular": string,"created_at"?: string,"data_nascimento": string,"email": string,"gc_id"?: string | null,"genero": Database["public"]['Enums']["koinonia_genero"],"id": string,"nome_completo": string,"role"?: Database["public"]['Enums']["koinonia_user_role"],"updated_at"?: string
                  }
                  Update: {
                    "ativo"?: boolean,"celular"?: string,"created_at"?: string,"data_nascimento"?: string,"email"?: string,"gc_id"?: string | null,"genero"?: Database["public"]['Enums']["koinonia_genero"],"id"?: string,"nome_completo"?: string,"role"?: Database["public"]['Enums']["koinonia_user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_profiles_gc_id_fkey"
      columns: ["gc_id"]
isOneToOne: false
      referencedRelation: "koinonia_gcs"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_projeto_imagens": {
                  Row: {
                    "created_at": string,"id": string,"ordem": number,"path": string,"projeto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"ordem"?: number,"path": string,"projeto_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"ordem"?: number,"path"?: string,"projeto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "koinonia_projeto_imagens_projeto_id_fkey"
      columns: ["projeto_id"]
isOneToOne: false
      referencedRelation: "koinonia_projetos"
      referencedColumns: ["id"]
    }
                  ]
                },"koinonia_projetos": {
                  Row: {
                    "created_at": string,"descricao": string,"id": string,"imagem_path": string | null,"ordem": number,"publicado": boolean,"resumo": string | null,"slug": string,"status": Database["public"]['Enums']["koinonia_projeto_status"],"titulo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"descricao": string,"id"?: string,"imagem_path"?: string | null,"ordem"?: number,"publicado"?: boolean,"resumo"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["koinonia_projeto_status"],"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"descricao"?: string,"id"?: string,"imagem_path"?: string | null,"ordem"?: number,"publicado"?: boolean,"resumo"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["koinonia_projeto_status"],"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"periferico_categorias": {
                  Row: {
                    "created_at": string,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"nome": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"periferico_emprestimo_itens": {
                  Row: {
                    "devolvido_em": string | null,"emprestimo_id": string,"estado_devolucao": Database["public"]['Enums']["periferico_estado_conservacao"] | null,"estado_saida": Database["public"]['Enums']["periferico_estado_conservacao"],"id": string,"item_id": string,"observacao_devolucao": string | null,"recebido_por": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "devolvido_em"?: string | null,"emprestimo_id": string,"estado_devolucao"?: Database["public"]['Enums']["periferico_estado_conservacao"] | null,"estado_saida": Database["public"]['Enums']["periferico_estado_conservacao"],"id"?: string,"item_id": string,"observacao_devolucao"?: string | null,"recebido_por"?: string | null
                  }
                  Update: {
                    "devolvido_em"?: string | null,"emprestimo_id"?: string,"estado_devolucao"?: Database["public"]['Enums']["periferico_estado_conservacao"] | null,"estado_saida"?: Database["public"]['Enums']["periferico_estado_conservacao"],"id"?: string,"item_id"?: string,"observacao_devolucao"?: string | null,"recebido_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "periferico_emprestimo_itens_emprestimo_id_periferico_emprestimo"
      columns: ["emprestimo_id"]
isOneToOne: false
      referencedRelation: "periferico_emprestimos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "periferico_emprestimo_itens_item_id_periferico_itens_id_fk"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "periferico_itens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "periferico_emprestimo_itens_recebido_por_periferico_profiles_id"
      columns: ["recebido_por"]
isOneToOne: false
      referencedRelation: "periferico_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"periferico_emprestimos": {
                  Row: {
                    "codigo": string,"created_at": string,"encerrado_em": string | null,"id": string,"liberado_por": string,"observacoes": string | null,"pessoa_id": string,"previsao_devolucao": string,"saida_em": string
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo"?: string,"created_at"?: string,"encerrado_em"?: string | null,"id"?: string,"liberado_por": string,"observacoes"?: string | null,"pessoa_id": string,"previsao_devolucao": string,"saida_em"?: string
                  }
                  Update: {
                    "codigo"?: string,"created_at"?: string,"encerrado_em"?: string | null,"id"?: string,"liberado_por"?: string,"observacoes"?: string | null,"pessoa_id"?: string,"previsao_devolucao"?: string,"saida_em"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "periferico_emprestimos_liberado_por_periferico_profiles_id_fk"
      columns: ["liberado_por"]
isOneToOne: false
      referencedRelation: "periferico_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "periferico_emprestimos_pessoa_id_periferico_pessoas_id_fk"
      columns: ["pessoa_id"]
isOneToOne: false
      referencedRelation: "periferico_pessoas"
      referencedColumns: ["id"]
    }
                  ]
                },"periferico_item_fotos": {
                  Row: {
                    "created_at": string,"id": string,"item_id": string,"ordem": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"item_id": string,"ordem"?: number,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"item_id"?: string,"ordem"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "periferico_item_fotos_item_id_periferico_itens_id_fk"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "periferico_itens"
      referencedColumns: ["id"]
    }
                  ]
                },"periferico_itens": {
                  Row: {
                    "categoria_id": string,"created_at": string,"criado_por": string | null,"descricao": string | null,"estado_conservacao": Database["public"]['Enums']["periferico_estado_conservacao"],"id": string,"local_armazenamento": string | null,"nome": string,"numero_serie": string | null,"status": Database["public"]['Enums']["periferico_status_item"],"tag": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_id": string,"created_at"?: string,"criado_por"?: string | null,"descricao"?: string | null,"estado_conservacao"?: Database["public"]['Enums']["periferico_estado_conservacao"],"id"?: string,"local_armazenamento"?: string | null,"nome": string,"numero_serie"?: string | null,"status"?: Database["public"]['Enums']["periferico_status_item"],"tag"?: string,"updated_at"?: string
                  }
                  Update: {
                    "categoria_id"?: string,"created_at"?: string,"criado_por"?: string | null,"descricao"?: string | null,"estado_conservacao"?: Database["public"]['Enums']["periferico_estado_conservacao"],"id"?: string,"local_armazenamento"?: string | null,"nome"?: string,"numero_serie"?: string | null,"status"?: Database["public"]['Enums']["periferico_status_item"],"tag"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "periferico_itens_categoria_id_periferico_categorias_id_fk"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "periferico_categorias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "periferico_itens_criado_por_periferico_profiles_id_fk"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "periferico_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"periferico_pessoas": {
                  Row: {
                    "created_at": string,"id": string,"ministerio": string | null,"nome": string,"observacoes": string | null,"telefone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"ministerio"?: string | null,"nome": string,"observacoes"?: string | null,"telefone"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"ministerio"?: string | null,"nome"?: string,"observacoes"?: string | null,"telefone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"periferico_profiles": {
                  Row: {
                    "ativo": boolean,"created_at": string,"email": string,"id": string,"nome": string,"perfil": Database["public"]['Enums']["periferico_perfil"]
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"email": string,"id": string,"nome": string,"perfil"?: Database["public"]['Enums']["periferico_perfil"]
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"email"?: string,"id"?: string,"nome"?: string,"perfil"?: Database["public"]['Enums']["periferico_perfil"]
                  }
                  Relationships: [
                    
                  ]
                },"races": {
                  Row: {
                    "created_at": string,"distance_km": number,"finished_at": string | null,"id": string,"name": string,"start_time": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"distance_km"?: number,"finished_at"?: string | null,"id"?: string,"name": string,"start_time"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"distance_km"?: number,"finished_at"?: string | null,"id"?: string,"name"?: string,"start_time"?: string | null,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "koinonia_perfis_basicos": {
                  Row: {
                    "gc_id": string | null,"genero": Database["public"]['Enums']["koinonia_genero"] | null,"id": string | null,"nome_completo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "gc_id"?: string | null,"genero"?: Database["public"]['Enums']["koinonia_genero"] | null,"id"?: string | null,"nome_completo"?: string | null
                         }
                        Update: {
                           "gc_id"?: string | null,"genero"?: Database["public"]['Enums']["koinonia_genero"] | null,"id"?: string | null,"nome_completo"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "koinonia_profiles_gc_id_fkey"
      columns: ["gc_id"]
isOneToOne: false
      referencedRelation: "koinonia_gcs"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "fertex_cancelar_pedido":
{ Args: { "p_pedido_id": string }; Returns: undefined
                           },
"fertex_concluir_pedido":
{ Args: { "p_forma_pagamento"?: Database["public"]['Enums']["fertex_forma_pagamento"],"p_pedido_id": string,"p_prazo_pagamento"?: string }; Returns: undefined
                           },
"fertex_dashboard_vendedor":
{ Args: { "p_dias"?: number,"p_estoque_baixo"?: number }; Returns: Json
                           },
"fertex_enviar_pedido_whatsapp":
{ Args: { "p_itens": Json,"p_observacao"?: string }; Returns: Json
                           },
"fertex_estatisticas_visitas":
{ Args: { "p_dias"?: number }; Returns: Json
                           },
"fertex_finalizar_compra":
{ Args: { "p_itens": Json }; Returns: string
                           },
"fertex_lucro":
{ Args: { "p_comissao": number,"p_custo": number,"p_preco_unitario": number,"p_quantidade": number,"p_tipo": Database["public"]['Enums']["fertex_tipo_ganho"] }; Returns: number
                           },
"fertex_meus_pedidos":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"fertex_normalizar_prazo":
{ Args: { "p_forma": Database["public"]['Enums']["fertex_forma_pagamento"],"p_prazo": string }; Returns: string
                           },
"fertex_pedidos_recebidos":
{ Args: { "p_status"?: Database["public"]['Enums']["fertex_status_pedido"] }; Returns: Json
                           },
"fertex_rede_de_robo":
{ Args: { "p_asn": number,"p_org": string }; Returns: boolean
                           },
"fertex_registrar_localizacao":
{ Args: { "p_lat": number,"p_lon": number,"p_precisao"?: number,"p_visitante": string }; Returns: undefined
                           },
"fertex_registrar_venda":
{ Args: { "p_cliente_nome"?: string,"p_cor"?: string,"p_forma_pagamento"?: Database["public"]['Enums']["fertex_forma_pagamento"],"p_prazo_pagamento"?: string,"p_preco_unitario"?: number,"p_produto_id": string,"p_quantidade": number }; Returns: string
                           },
"fertex_registrar_visita":
{ Args: { "p_origem"?: string,"p_produto_id"?: string,"p_referrer"?: string,"p_vendedor_id"?: string,"p_visitante"?: string }; Returns: undefined
                           },
"fertex_resolver_localizacoes":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"fertex_vendas_vendedor":
{ Args: { "p_fim"?: string,"p_inicio"?: string,"p_produto_id"?: string }; Returns: {
              "comprador_nome": string,"cor": string,"data": string,"forma_pagamento": Database["public"]['Enums']["fertex_forma_pagamento"],"item_id": string,"lucro": number,"origem": Database["public"]['Enums']["fertex_origem_pedido"],"pedido_id": string,"prazo_pagamento": string,"preco_unitario": number,"produto_id": string,"produto_nome": string,"quantidade": number,"tipo_ganho": Database["public"]['Enums']["fertex_tipo_ganho"],"total": number,"unidade": Database["public"]['Enums']["fertex_unidade"]
            }[]
                           },
"fertex_vendedores_publicos":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"nome": string,"whatsapp": string
            }[]
                           },
"finish_race":
{ Args: { "p_race_id": string }; Returns: {
              "created_at": string,
"distance_km": number,
"finished_at": string | null,
"id": string,
"name": string,
"start_time": string | null,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "races"
        isOneToOne: true
        isSetofReturn: false
      } },
"koinonia_auth_user_id_por_email":
{ Args: { "p_email": string }; Returns: string
                           },
"koinonia_aviso_vigente":
{ Args: { "p_exibir_ate": string }; Returns: boolean
                           },
"koinonia_cantina_disponibilidade":
{ Args: { "p_cantina_id": string }; Returns: {
              "item_id": string,"reservado": number
            }[]
                           },
"koinonia_cantina_do_item":
{ Args: { "p_item_id": string }; Returns: string
                           },
"koinonia_current_user_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["koinonia_user_role"]
                           },
"koinonia_informar_pagamento":
{ Args: { "p_evento_id": string }; Returns: undefined
                           },
"koinonia_is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"koinonia_is_admin_or_pastor":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"koinonia_is_equipe_cantina":
{ Args: { "p_cantina_id": string }; Returns: boolean
                           },
"koinonia_is_lider_of":
{ Args: { "p_ministerio_id": string }; Returns: boolean
                           },
"koinonia_is_lider_of_profile":
{ Args: { "p_profile_id": string }; Returns: boolean
                           },
"koinonia_is_membro_ativo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"koinonia_is_responsavel_evento":
{ Args: { "p_evento_id": string }; Returns: boolean
                           },
"koinonia_is_responsavel_por_inscrito":
{ Args: { "p_profile_id": string }; Returns: boolean
                           },
"koinonia_participa_de":
{ Args: { "p_ministerio_id": string }; Returns: boolean
                           },
"koinonia_sincronizar_papel_lider":
{ Args: { "p_profile_id": string }; Returns: undefined
                           },
"periferico_is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"periferico_is_usuario_ativo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"periferico_perfil_atual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["periferico_perfil"]
                           },
"reset_race":
{ Args: { "p_race_id": string }; Returns: {
              "created_at": string,
"distance_km": number,
"finished_at": string | null,
"id": string,
"name": string,
"start_time": string | null,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "races"
        isOneToOne: true
        isSetofReturn: false
      } },
"server_now":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"start_race":
{ Args: { "p_race_id": string }; Returns: {
              "created_at": string,
"distance_km": number,
"finished_at": string | null,
"id": string,
"name": string,
"start_time": string | null,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "races"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "fertex_forma_pagamento": "pix"|"dinheiro"|"boleto"|"cheque","fertex_origem_pedido": "loja"|"manual"|"whatsapp","fertex_perfil": "vendedor"|"comprador","fertex_status_pedido": "pendente"|"concluido"|"cancelado","fertex_tipo_ganho": "revenda"|"comissao","fertex_unidade": "kg"|"litro"|"saco"|"unidade"|"caixa"|"rolo"|"metro","koinonia_cantina_modo": "levar"|"comer_aqui","koinonia_genero": "masculino"|"feminino","koinonia_inscricao_status": "pendente"|"confirmada"|"recusada","koinonia_projeto_status": "planejado"|"em_andamento"|"concluido","koinonia_publico_evento": "homens"|"mulheres"|"todos","koinonia_tipo_chave_pix": "cnpj"|"cpf"|"email"|"telefone"|"aleatoria","koinonia_user_role": "ADMIN"|"PASTOR"|"LIDER_MINISTERIO"|"MEMBRO","periferico_estado_conservacao": "novo"|"bom"|"regular"|"ruim"|"danificado","periferico_perfil": "admin"|"operador","periferico_status_item": "disponivel"|"emprestado"|"manutencao"|"baixado"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "fertex_forma_pagamento": ["pix", "dinheiro", "boleto", "cheque"],"fertex_origem_pedido": ["loja", "manual", "whatsapp"],"fertex_perfil": ["vendedor", "comprador"],"fertex_status_pedido": ["pendente", "concluido", "cancelado"],"fertex_tipo_ganho": ["revenda", "comissao"],"fertex_unidade": ["kg", "litro", "saco", "unidade", "caixa", "rolo", "metro"],"koinonia_cantina_modo": ["levar", "comer_aqui"],"koinonia_genero": ["masculino", "feminino"],"koinonia_inscricao_status": ["pendente", "confirmada", "recusada"],"koinonia_projeto_status": ["planejado", "em_andamento", "concluido"],"koinonia_publico_evento": ["homens", "mulheres", "todos"],"koinonia_tipo_chave_pix": ["cnpj", "cpf", "email", "telefone", "aleatoria"],"koinonia_user_role": ["ADMIN", "PASTOR", "LIDER_MINISTERIO", "MEMBRO"],"periferico_estado_conservacao": ["novo", "bom", "regular", "ruim", "danificado"],"periferico_perfil": ["admin", "operador"],"periferico_status_item": ["disponivel", "emprestado", "manutencao", "baixado"]
          }
        }
} as const
