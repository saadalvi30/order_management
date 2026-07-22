const swaggerJsdoc = require("swagger-jsdoc"); 
const path = require("path");
 const modulesApiPath = path.join(__dirname, "..", "modules", "**", "*.js").replace(/\\/g, "/"); 
 const options = { definition:
     { openapi: "3.0.0", info:
         { title: "Inventory Reservation and Order Fulfilment API",
      version: "1.0.0",
      description:
      "A backend system for product inventory, stock reservation, and order fulfilment (Admin, Staff, Customer roles).", },
      servers: 
     [{ url: "/", description: "localhost:3500/" }], 
         tags: [
      { name: "Auth", description: "Authentication APIs" },
      { name:"Users"},
      { name: "Products", description: "Product inventory management" },
      { name: "Orders", description: "Order creation, fulfilment, and cancellation" },
    ],
      components: 
     { securitySchemes:
        { bearerAuth: { type: "http", scheme: "bearer",
     bearerFormat:
      "JWT" },
         },
             },
              security: [{ bearerAuth: [] }],
             },
               apis: [modulesApiPath], };
                module.exports = swaggerJsdoc(options);