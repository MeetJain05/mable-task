import { createApp } from './app';
import { createDatabase } from './db/database';
import { initSchema } from './db/schema';

const db = createDatabase();
initSchema(db);

const app = createApp(db);
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
