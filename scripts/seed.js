const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Seeding database...');

    // Check if admin user already exists
    const existingAdmin = await pool.query(
      'SELECT email FROM auth_allowed_emails WHERE email = $1',
      ['admin@example.com']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists, skipping seed');
      return;
    }

    // Insert initial admin user
    await pool.query(
      'INSERT INTO auth_allowed_emails (email, display_name, role, invited_by, active) VALUES ($1, $2, $3, $4, $5)',
      ['admin@example.com', 'System Administrator', 'admin', 'system', true]
    );

    // Insert some example users
    const exampleUsers = [
      {
        email: 'user1@example.com',
        display_name: 'John Doe',
        role: 'viewer',
        invited_by: 'admin@example.com',
      },
      {
        email: 'user2@example.com',
        display_name: 'Jane Smith',
        role: 'qa',
        invited_by: 'admin@example.com',
      },
      {
        email: 'user3@example.com',
        display_name: 'Bob Johnson',
        role: 'viewer',
        invited_by: 'admin@example.com',
      },
    ];

    for (const user of exampleUsers) {
      await pool.query(
        'INSERT INTO auth_allowed_emails (email, display_name, role, invited_by, active) VALUES ($1, $2, $3, $4, $5)',
        [user.email, user.display_name, user.role, user.invited_by, true]
      );
    }

    console.log('Database seeded successfully');
    console.log('Admin user: admin@example.com');
    console.log('Example users added:', exampleUsers.map(u => u.email).join(', '));

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
