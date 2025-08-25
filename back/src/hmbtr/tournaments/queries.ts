export const createTableTournamentsQuery = `
    CREATE TABLE tournaments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        event_date DATE,
        country_id INTEGER NOT NULL,
        city_id INTEGER NOT NULL
    );
`;

export const getTournamentsQuery = `
    SELECT * FROM tournaments
`;

export const getTournamentQuery = `
    SELECT * FROM tournaments 
    WHERE id = $1
`;

export const checkTournamentQuery = `
    SELECT EXISTS (
        SELECT 1 FROM tournaments 
        WHERE name = $1 AND event_date = $2 AND city_id = $3
    );
`;

export const addTournamentQuery = `
    INSERT INTO fighters (name, event_date, country_id, city_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
`;
