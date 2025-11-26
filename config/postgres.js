const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.POSTGRES_URI, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // disable SQL logging
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // needed for Neon or some cloud hosts
        }
    }
});

const connectPostgres = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL Connected Successfully');
    } catch (err) {
        console.error('❌ PostgreSQL Connection Error:', err.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connectPostgres };
