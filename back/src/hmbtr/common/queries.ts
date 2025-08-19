export const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `;

export const createTableCountriesQuery = `
    CREATE TABLE countries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    );
`;

export const createTableCitiesQuery = `
    CREATE TABLE cities (
        id SERIAL PRIMARY KEY,
        country_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        FOREIGN KEY (country_id) REFERENCES countries(id)
    );
`;

export const createTableClubsQuery = `
    CREATE TABLE clubs (
        id SERIAL PRIMARY KEY,
        city_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        FOREIGN KEY (city_id) REFERENCES cities(id)
    );
`;

export const initTableCountriesQuery = `
    INSERT INTO countries (name)
    VALUES ('Россия');
`;

export const initTableCitiesQuery = `
    INSERT INTO cities (name, country_id)
    VALUES ('Москва', 1);
    INSERT INTO cities (name, country_id)
    VALUES ('Санкт-Петербург', 1);
    INSERT INTO cities (name, country_id)
    VALUES ('Курск', 1);
`;

export const initTableClubsQuery = `
    INSERT INTO clubs (name, city_id)
    VALUES ('Байард', 1);
    INSERT INTO clubs (name, city_id)
    VALUES ('Пересвет', 2);
    INSERT INTO clubs (name, city_id)
    VALUES ('Авалон', 3);
`;

export const getCountriesQuery = `
    SELECT * FROM countries
`;

export const getDataByIdQuery = (tableName: string, columnName: string) => `
    SELECT * FROM ${tableName} 
    WHERE ${columnName} = $1
`;

export const checkCountryQuery = `
    SELECT EXISTS (
        SELECT 1 FROM countries 
        WHERE name = $1
    );
`;

export const checkDataQuery = (tableName: string, columnName: string) => `
    SELECT EXISTS (
        SELECT 1 FROM ${tableName} 
        WHERE name = $1 AND ${columnName} = $2
    );
`;

export const addCountryQuery = `
    INSERT INTO countries (name)
    VALUES ($1)
    RETURNING *;
`;

export const addDataQuery = (tableName: string, columnName: string) => `
    INSERT INTO ${tableName} (name, ${columnName})
    VALUES ($1, $2)
    RETURNING *;
`;
