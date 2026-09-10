CREATE TABLE reports (reason TEXT NOT NULL CHECK (reason IN ('content', 'missing')));
