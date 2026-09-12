const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 80;

app.use(express.urlencoded({ extended: true }));

const dbConfig = {
  host: 'okami-database-s4032589.ci2epya9edbp.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'okamipassword',
  database: 'okami_inventory',
  connectTimeout: 5000
};

app.get('/', async (req, res) => {
  let tableRowsHtml = '';

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT id, item_name, price, quantity, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS formatted_date FROM inventory ORDER BY id DESC"
    );
    await connection.end();

    if (rows.length === 0) {
      tableRowsHtml = '<tr><td colspan="4" style="text-align:center;">No inventory records found. Add one below!</td></tr>';
    } else {
      tableRowsHtml = rows.map(item => `
        <tr>
          <td>${item.id}</td>
          <td><strong>${item.item_name}</strong></td>
          <td>${item.price}</td>
          <td>${item.quantity}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Database Connection Error:', error);
    tableRowsHtml = '<tr><td colspan="4" style="color:red; text-align:center;">Failed to get data</td></tr>';
  }

  const htmlPage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Okami Inventory</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background-color: #f9f9f9; color: #333; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #232f3e; border-bottom: 2px solid #ff9900; padding-bottom: 10px; }
        .card { background: #f1f3f5; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        form { display: grid; gap: 12px; max-width: 400px; }
        label { font-weight: bold; }
        input { padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; }
        button { background-color: #ff9900; color: white; font-weight: bold; padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 15px; }
        button:hover { background-color: #e68a00; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #232f3e; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Okami Inventory</h1>

        <div class="card">
          <h3>Add new item:</h3>
          <form action="/add-item" method="POST">
            <div>
              <label for="name">Item Name:</label><br>
              <input type="text" id="name" name="item_name" placeholder="Coffee" required>
            </div>
            <div>
              <label for="price">Price:</label><br>
              <input type="number" id="price" name="price" placeholder="15" min="1" required>
            </div>
            <div>
              <label for="quantity">Quantity:</label><br>
              <input type="number" id="quantity" name="quantity" placeholder="1" min="1" required>
            </div>
            <button type="submit">Add item</button>
          </form>
        </div>

        <!-- Inventory Table Rendered Server-Side -->
        <h3>Current Inventory Records</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item Name</th>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  res.send(htmlPage);
});

app.post('/add-item', async (req, res) => {
  const { item_name, price, quantity } = req.body;
  const parsedPrice = Number.parseFloat(price);
  const parsedQuantity = Number.parseInt(quantity, 10);

  if (
    !item_name?.trim() ||
    !Number.isInteger(parsedPrice) ||
    parsedPrice < 0 ||
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity < 1
  ) {
    return res.status(400).send('Please enter valid item name, price and quantity.');
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      'INSERT INTO inventory (item_name, price, quantity) VALUES (?, ?, ?)',
      [item_name.trim(), parsedPrice, parsedQuantity]
    );
    await connection.end();

    res.redirect('/');
  } catch (error) {
    console.error('Database Insert Error:', error);
    res.status(500).send(`<p>${error.message}</p>`);
  }
});

app.listen(PORT, () => {
  console.log(`Okami App running on http://localhost:${PORT}`);
});