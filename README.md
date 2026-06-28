# Dai de Açúcar Gestão

Aplicativo PWA para confeitaria com foco em:

- cadastro de ingredientes
- cadastro de receitas
- precificação
- simulador de lucro
- histórico
- tela premium
- configurações

## Stack escolhida

- **Frontend/PWA:** Vite + React + TypeScript
- **Deploy:** Vercel
- **Banco/Auth/Storage:** Supabase

## Como testar agora

O projeto já funciona em **modo demonstração local** usando LocalStorage.

### Rodar localmente

```bash
npm install
npm run dev
```

### Build de produção

```bash
npm run build
npm run preview
```

## Como conectar no Supabase depois

1. Criar um projeto no Supabase
2. Executar o SQL em `supabase/schema.sql`
3. Copiar `.env.example` para `.env`
4. Preencher:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Deploy na Vercel

1. Subir este projeto para GitHub
2. Importar na Vercel
3. Adicionar as variáveis de ambiente do Supabase
4. Fazer deploy

## Hostinger

A Hostinger pode ser usada depois para:

- registrar/apontar domínio
- criar e-mail profissional

O app em si pode continuar hospedado na **Vercel**, com o banco no **Supabase**.

## Observação importante

Nesta versão entregue aqui, o foco foi deixar o produto **testável agora** e **pronto para adaptação ao Supabase em produção**.
