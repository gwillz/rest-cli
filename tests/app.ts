
import express from 'express';

const PORT = process.env.PORT || 3000;

export function main() {
    return express()
    
    .post("/api/users/new", (req, res) => {
        res.send({ user_id: 123 });
    })
    
    .get("/api/users/:user_id", (req, res) => {
        res.send({
            name: "AJ",
            user_id: req.params.user_id,
         });
    })
    
    .get("/api/search", (req, res) => {
        res.send({
            keyword: req.query.keyword,
            filter: req.query.filter,
         });
    })
    
    .listen(PORT, () => {
        console.log("listening on port:", PORT);
        console.log("Press Ctrl+C to quit.");
    });
}

if (require.main === module) {
    main();
}
