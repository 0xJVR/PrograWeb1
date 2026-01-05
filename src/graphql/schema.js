const { gql } = require('graphql-tag');

const typeDefs = gql`
  scalar Date

  type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    image: String
    stock: Int
    category: String
    createdAt: Date
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    profileColor: Int
    cart: Cart
  }

  type Cart {
    items: [CartItem]
    total: Float
    updatedAt: Date
  }

  type CartItem {
    product: Product
    quantity: Int!
    lineTotal: Float
  }

  type OrderItem {
    product: Product
    name: String!
    price: Float!
    quantity: Int!
    lineTotal: Float!
  }

  type Order {
    id: ID!
    user: User
    items: [OrderItem]!
    total: Float!
    status: String!
    createdAt: Date
  }

  type Query {
    products: [Product]
    product(id: ID!): Product
    myCart: Cart
    myOrders: [Order]
    orders(status: String): [Order]
    order(id: ID!): Order
    users: [User]
  }

  type Mutation {
    addToCart(productId: ID!, quantity: Int): Cart
    updateCartItem(productId: ID!, quantity: Int!): Cart
    removeFromCart(productId: ID!): Cart
    clearCart: Cart
    checkout: Order
    setOrderStatus(orderId: ID!, status: String!): Order
    
    # User Management (Admin)
    deleteUser(userId: ID!): Boolean
    changeUserRole(userId: ID!, role: String!): User
  }
`;

module.exports = typeDefs;
