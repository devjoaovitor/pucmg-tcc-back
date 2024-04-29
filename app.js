const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
require("dotenv").config();
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const db = require("./db");

app.use(bodyParser.json());

app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res
      .status(400)
      .json({ error: "É necessário fornecer email e senha" });
  }

  try {
    const queryResult = await db.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (queryResult.rows.length === 0) {
      console.log("Usuário não encontrado no banco de dados.");
      return res
        .status(401)
        .json({ error: "Usuário não encontrado ou senha incorreta" });
    }

    const usuario = queryResult.rows[0];

    if (senha !== usuario.senha) {
      console.log("Senha fornecida não corresponde.");
      return res
        .status(401)
        .json({ error: "Usuário não encontrado ou senha incorreta" });
    }

    delete usuario.senha;
    console.log(`Usuário ${email} autenticado com sucesso.`);
    res.json({ usuario });
  } catch (err) {
    console.error("Erro ao tentar fazer login", err);
    res.status(500).json({ error: "Erro interno ao tentar fazer login" });
  }
});


app.get('/relatorio-bebidas', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM bebidas');
    const bebidas = result.rows;

    if (bebidas.length === 0) {
      return res.status(404).json({ message: 'Nenhuma bebida encontrada.' });
    }

    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(pdfData),
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment;filename=relatorio_bebidas.pdf',
      })
      .end(pdfData);
    });

    doc.fontSize(14).text('Relatório de Bebidas', { underline: true }).moveDown(2);
    bebidas.forEach((bebida, index) => {
      doc.fontSize(12).text(`Bebida ${index + 1}:`, { underline: true }).moveDown(0.5);
      doc.fontSize(10).text(`Nome: ${bebida.nomebebida}`);
      doc.fontSize(10).text(`Teor Alcoólico: ${bebida.teoralcoolico}%`);
      doc.fontSize(10).text(`Quantidade: ${bebida.quantidadebebida}`);
      doc.fontSize(10).text(`Valor Unitário: R$ ${parseFloat(bebida.valorunitario).toFixed(2)}`);
      doc.fontSize(10).text(`Tipo: ${bebida.tipobebida}`);
      doc.fontSize(10).text(`Descrição: ${bebida.descricao}`).moveDown(2);
    });

    doc.end();

  } catch (error) {
    console.error('Erro ao gerar relatório de bebidas:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de bebidas. Por favor, tente novamente mais tarde.' });
  }
});


app.post('/bebidas', async (req, res) => {
  const { quantidadeBebida, teorAlcoolico, valorUnitario, descricao, tipoBebida, nomeBebida } = req.body;

  try {
    const query = 'INSERT INTO bebidas (quantidadebebida, teoralcoolico, valorunitario, descricao, tipobebida, nomebebida) VALUES ($1, $2, $3, $4, $5, $6)';
    const values = [quantidadeBebida, teorAlcoolico, valorUnitario, descricao, tipoBebida, nomeBebida];
    await db.query(query, values);
  
    res.status(200).json({ message: 'Bebida registrada com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar a bebida:', error);
    res.status(500).json({ error: 'Erro ao registrar a bebida. Por favor, tente novamente mais tarde.' });
  }
});

app.put('/bebidas/:id', async (req, res) => {
  const { quantidadeBebida, teorAlcoolico, valorUnitario, descricao, tipoBebida, nomeBebida } = req.body;
  const bebidaId = req.params.id;

  try {
    const query = `
      UPDATE bebidas
      SET quantidadebebida = $1, teoralcoolico = $2, valorunitario = $3, descricao = $4, tipobebida = $5, nomebebida = $6
      WHERE id = $7
    `;
    const values = [quantidadeBebida, teorAlcoolico, valorUnitario, descricao, tipoBebida, nomeBebida, bebidaId];
    await db.query(query, values);

    res.status(200).json({ message: 'Bebida atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar a bebida:', error);
    res.status(500).json({ error: 'Erro ao atualizar a bebida.' });
  }
});

app.get('/bebidas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'SELECT * FROM bebidas WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Bebida não encontrada.' });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Erro ao obter bebida:', error);
    res.status(500).json({ error: 'Erro ao obter bebida.' });
  }
});

app.get('/bebidas', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM bebidas');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao obter bebidas:', error);
    res.status(500).json({ error: 'Erro ao obter bebidas.' });
  }
});

app.delete('/bebidas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const checkQuery = 'SELECT * FROM bebidas WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ message: 'Bebida não encontrada.' });
    }

    const deleteQuery = 'DELETE FROM bebidas WHERE id = $1';
    await db.query(deleteQuery, [id]);

    res.status(200).json({ message: 'Bebida excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir a bebida:', error);
    res.status(500).json({ error: 'Erro ao excluir a bebida.' });
  }
});


app.get('/usuarios', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM usuarios');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao obter usuários:', error);
    res.status(500).json({ error: 'Erro ao obter usuários.' });
  }
});

app.get('/usuarios/:id', async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ error: 'ID do usuário não fornecido.' });
  }

  try {
    const result = await db.query('SELECT * FROM usuarios WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter usuário por ID:', error);
    res.status(500).json({ error: 'Erro ao obter usuário por ID.' });
  }
});

app.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, permissao } = req.body;

  try {
    const query = 'UPDATE usuarios SET nome = $1, email = $2, senha = $3, permissao = $4 WHERE id = $5';
    const values = [nome, email, senha, permissao, id];
    await db.query(query, values);

    res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

app.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM usuarios WHERE id = $1';
    const values = [id];
    await db.query(query, values);

    res.status(200).json({ message: 'Usuário excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

app.post('/usuarios', async (req, res) => {
  const { nome, email, senha, permissao } = req.body;

  try {
    const query = 'INSERT INTO usuarios (nome, email, senha, permissao) VALUES ($1, $2, $3, $4)';
    const values = [nome, email, senha, permissao];
    await db.query(query, values);

    res.status(200).json({ message: 'Usuário cadastrado com sucesso.' });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
  }
});

app.put('/usuarios/alterar-senha/:id', async (req, res) => {
  const userId = req.params.id;
  const { novaSenha } = req.body;

  if (!novaSenha) {
    return res.status(400).json({ error: 'A nova senha é obrigatória.' });
  }

  try {
    const query = `
      UPDATE usuarios
      SET senha = $1
      WHERE id = $2
    `;
    const values = [novaSenha, userId];
    await db.query(query, values);

    res.status(200).json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Erro ao alterar a senha:', error);
    res.status(500).json({ error: 'Erro ao alterar a senha.' });
  }
});

app.post('/vendas', async (req, res) => {
  const { evento, bebida, quantidade, formaPagamento, valorVenda, nome_bebida } = req.body;

  try {
    await db.query('BEGIN');

    const queryEvento = 'SELECT bebidas FROM eventos WHERE id = $1';
    const eventoResult = await db.query(queryEvento, [evento]);  
    if (eventoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    let bebidas = eventoResult.rows[0].bebidas;
    let bebidaEncontrada = bebidas.find(b => b.nome === bebida);
    if (!bebidaEncontrada) {
      return res.status(404).json({ error: 'Bebida não encontrada neste evento.' });
    }

    if (bebidaEncontrada.quantidade < quantidade) {
      return res.status(400).json({ error: 'Estoque insuficiente.' });
    }

    bebidaEncontrada.quantidade -= quantidade;
    const queryUpdateEvento = 'UPDATE eventos SET bebidas = $1 WHERE id = $2';
    await db.query(queryUpdateEvento, [JSON.stringify(bebidas), evento]);

    const queryInsertVenda = 'INSERT INTO vendas (bebida_id, quantidade, formapagamento, valorvenda, evento_id, nome_bebida) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const valuesInsertVenda = [bebidaEncontrada.id, quantidade, formaPagamento, valorVenda, evento, nome_bebida];
    const resultVenda = await db.query(queryInsertVenda, valuesInsertVenda);

    await db.query('COMMIT');

    res.status(200).json({ message: 'Venda registrada com sucesso.', venda: resultVenda.rows[0] });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao registrar a venda:', error);
    res.status(500).json({ error: 'Erro ao registrar a venda.' });
  }
});

app.get('/vendas', async (req, res) => {
  try {
    const query = 'SELECT * FROM vendas;';
    const result = await db.query(query);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao obter vendas:', error);
    res.status(500).json({ error: 'Erro ao obter vendas.' });
  }
});

app.get('/relatorio-vendas', async (req, res) => {
  try {
    const result = await db.query('SELECT nome_bebida, quantidade, formapagamento, valorvenda, data_hora FROM vendas');
    const vendas = result.rows;

    if (vendas.length === 0) {
      return res.status(404).json({ message: 'Nenhuma venda encontrada.' });
    }

    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(pdfData),
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment;filename=relatorio_vendas.pdf',
      })
      .end(pdfData);
    });

    doc.fontSize(14).text('Relatório de Vendas', { underline: true }).moveDown(2);
    vendas.forEach((venda, index) => {
      doc.fontSize(12).text(`Venda ${index + 1}:`, { underline: true }).moveDown(0.5);
      doc.fontSize(10).text(`Bebida: ${venda.nome_bebida}`);
      doc.fontSize(10).text(`Quantidade: ${venda.quantidade}`);
      doc.fontSize(10).text(`Forma de Pagamento: ${venda.formapagamento}`);
      doc.fontSize(10).text(`Valor da Venda: R$ ${parseFloat(venda.valorvenda).toFixed(2)}`);

      const dataVenda = new Date(venda.data_hora);
      const dataFormatada = `${dataVenda.getDate().toString().padStart(2, '0')}/${(dataVenda.getMonth() + 1).toString().padStart(2, '0')}/${dataVenda.getFullYear()}`
      doc.fontSize(10).text(`Data da Venda: ${dataFormatada}`);
      doc.moveDown(2);
    });

    doc.end();

  } catch (error) {
    console.error('Erro ao gerar relatório de vendas:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de vendas. Por favor, tente novamente mais tarde.' });
  }
});

app.post('/eventos', async (req, res) => {
  const { nomeEvento, dataEvento, localEvento, bebidas } = req.body;

  if (!nomeEvento || !dataEvento || !localEvento || !bebidas) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    await db.query('BEGIN');

    const queryInsertEvento = `
      INSERT INTO eventos (nome_evento, data_evento, local_evento, bebidas)
      VALUES ($1, $2, $3, $4)
      RETURNING id`;
    const valuesInsertEvento = [nomeEvento, dataEvento, localEvento, JSON.stringify(bebidas)];
    const resultEvento = await db.query(queryInsertEvento, valuesInsertEvento);
    const eventoId = resultEvento.rows[0].id;

    for (const bebida of bebidas) {
      const { nome, quantidade } = bebida;

      const queryUpdateBebidas = 'UPDATE bebidas SET quantidadebebida = quantidadebebida - $1 WHERE nomebebida = $2';
      await db.query(queryUpdateBebidas, [quantidade, nome]);
    }

    await db.query('COMMIT');
    res.status(200).json({ message: 'Evento registrado com sucesso.', eventoId });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Erro ao adicionar evento:', error);
    res.status(500).json({ error: 'Erro ao adicionar evento.' });
  }
});

app.get('/eventos', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM eventos');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao obter eventos:', error);
    res.status(500).json({ error: 'Erro ao obter eventos.' });
  }
});

app.get('/eventos/:id', async (req, res) => {
  const eventId = req.params.id;

  try {
    const result = await db.query('SELECT * FROM eventos WHERE id = $1', [eventId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter evento:', error);
    res.status(500).json({ error: 'Erro ao obter evento.' });
  }
});

app.put('/eventos/:id', async (req, res) => {
  const eventId = req.params.id;
  const { nome_evento, data_evento, local_evento, bebidas } = req.body;

  try {
    const result = await db.query(
      'UPDATE eventos SET nome_evento = $1, data_evento = $2, local_evento = $3, bebidas = $4 WHERE id = $5 RETURNING *',
      [nome_evento, data_evento, local_evento, JSON.stringify(bebidas), eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    res.status(500).json({ error: 'Erro ao atualizar evento.' });
  }
});

app.get('/relatorio-eventos', async (req, res) => {
  try {
    const result = await db.query('SELECT id, nome_evento, data_evento, local_evento FROM eventos');
    const eventos = result.rows;

    if (eventos.length === 0) {
      return res.status(404).json({ message: 'Nenhum evento encontrado.' });
    }

    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(pdfData),
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment;filename=relatorio_eventos.pdf',
      })
      .end(pdfData);
    });

    doc.fontSize(14).text('Relatório de Eventos', { underline: true }).moveDown(2);
    eventos.forEach((evento, index) => {
      doc.fontSize(12).text(`Evento ${index + 1}:`, { underline: true }).moveDown(0.5);
      doc.fontSize(10).text(`Nome: ${evento.nome_evento}`);
      doc.fontSize(10).text(`Local: ${evento.local_evento}`);

      const dataEvento = new Date(evento.data_evento);
      const dataFormatada = `${dataEvento.getDate().toString().padStart(2, '0')}/${(dataEvento.getMonth() + 1).toString().padStart(2, '0')}/${dataEvento.getFullYear()}`
      doc.fontSize(10).text(`Data do Evento: ${dataFormatada}`);

      doc.moveDown(2);
    });

    doc.end();

  } catch (error) {
    console.error('Erro ao gerar relatório de eventos:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de eventos. Por favor, tente novamente mais tarde.' });
  }
});

app.delete('/eventos/:id', async (req, res) => {
  const eventId = req.params.id;

  try {
    const result = await db.query(
      'DELETE FROM eventos WHERE id = $1 RETURNING *',
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    res.status(200).json({ message: 'Evento excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir evento:', error);
    res.status(500).json({ error: 'Erro ao excluir evento.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor está rodando na porta ${PORT}`);
});
