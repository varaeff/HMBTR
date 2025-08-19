export const createTableFightersQuery = `
    CREATE TABLE fighters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        surname VARCHAR(255) NOT NULL,
        patronymic VARCHAR(255),
        birthday DATE,
        country_id INTEGER NOT NULL,
        city_id INTEGER NOT NULL,
        club_id INTEGER,
        pic TEXT
    );
`;

export const getFightersQuery = `
    SELECT * FROM fighters
`;

export const getFighterQuery = `
    SELECT * FROM fighters 
    WHERE id = $1
`;

export const checkFighterQuery = `
    SELECT EXISTS (
        SELECT 1 FROM fighters 
        WHERE name = $1 AND surname = $2 AND patronymic = $3 AND city_id = $4
    );
`;

export const addFighterQuery = `
    INSERT INTO fighters (name, surname, patronymic, birthday, country_id, city_id, club_id, pic)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
`;
