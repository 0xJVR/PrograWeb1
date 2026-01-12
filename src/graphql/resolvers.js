const { GraphQLError } = require('graphql');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

// Helper to check auth
const checkAuth = (context) => {
    if (!context.user) {
        throw new GraphQLError('Usuario no autenticado', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }
    return context.user;
};

// Helper to check admin
const checkAdmin = (context) => {
    const user = checkAuth(context);
    if (user.role !== 'admin') {
        throw new GraphQLError('No tienes permisos de administrador', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
    return user;
};

const resolvers = {
    Query: {
        products: async () => {
            return await Product.find({});
        },
        product: async (_, { id }) => {
            return await Product.findById(id);
        },
        myCart: async (_, __, context) => {
            const user = checkAuth(context);
            const dbUser = await User.findById(user.id).populate('cart.items.product');
            if (!dbUser) return null;

            // Filter out null products (if product was deleted)
            const validItems = dbUser.cart.items.filter(item => item.product);

            const total = validItems.reduce((acc, item) => {
                return acc + (item.product.price * item.quantity);
            }, 0);

            return {
                items: validItems,
                total,
                updatedAt: dbUser.cart.updatedAt
            };
        },
        myOrders: async (_, __, context) => {
            const user = checkAuth(context);
            return await Order.find({ user: user.id }).sort({ createdAt: -1 });
        },
        orders: async (_, { status }, context) => {
            checkAdmin(context);
            const filter = {};
            if (status) filter.status = status;
            return await Order.find(filter).populate('user').sort({ createdAt: -1 });
        },
        order: async (_, { id }, context) => {
            const user = checkAuth(context);
            const order = await Order.findById(id).populate('user');

            if (!order) return null;

            if (user.role !== 'admin' && order.user._id.toString() !== user.id) {
                throw new GraphQLError('No autorizado para ver esta orden', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }
            return order;
        },
        users: async (_, __, context) => {
            checkAdmin(context);
            return await User.find({});
        }
    },

    Mutation: {
        addToCart: async (_, { productId, quantity = 1 }, context) => {
            const user = checkAuth(context);
            const dbUser = await User.findById(user.id);

            const product = await Product.findById(productId);
            if (!product) throw new GraphQLError('Producto no encontrado');

            const existingItemIndex = dbUser.cart.items.findIndex(
                item => item.product.toString() === productId
            );

            if (existingItemIndex > -1) {
                dbUser.cart.items[existingItemIndex].quantity += quantity;
            } else {
                dbUser.cart.items.push({ product: productId, quantity });
            }

            dbUser.cart.updatedAt = new Date();
            await dbUser.save();

            // Re-fetch to populate for return
            const updatedUser = await User.findById(user.id).populate('cart.items.product');
            const validItems = updatedUser.cart.items.filter(item => item.product);
            const total = validItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

            return { items: validItems, total, updatedAt: updatedUser.cart.updatedAt };
        },
        updateCartItem: async (_, { productId, quantity }, context) => {
            const user = checkAuth(context);
            const dbUser = await User.findById(user.id);

            const itemIndex = dbUser.cart.items.findIndex(
                item => item.product.toString() === productId
            );

            if (itemIndex > -1) {
                if (quantity <= 0) {
                    dbUser.cart.items.splice(itemIndex, 1);
                } else {
                    dbUser.cart.items[itemIndex].quantity = quantity;
                }
                dbUser.cart.updatedAt = new Date();
                await dbUser.save();
            }

            const updatedUser = await User.findById(user.id).populate('cart.items.product');
            const validItems = updatedUser.cart.items.filter(item => item.product);
            const total = validItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

            return { items: validItems, total, updatedAt: updatedUser.cart.updatedAt };
        },
        removeFromCart: async (_, { productId }, context) => {
            const user = checkAuth(context);
            const dbUser = await User.findById(user.id);

            dbUser.cart.items = dbUser.cart.items.filter(
                item => item.product.toString() !== productId
            );

            dbUser.cart.updatedAt = new Date();
            await dbUser.save();

            const updatedUser = await User.findById(user.id).populate('cart.items.product');
            const validItems = updatedUser.cart.items.filter(item => item.product);
            const total = validItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

            return { items: validItems, total, updatedAt: updatedUser.cart.updatedAt };
        },
        clearCart: async (_, __, context) => {
            const user = checkAuth(context);
            const dbUser = await User.findById(user.id);
            dbUser.cart.items = [];
            dbUser.cart.updatedAt = new Date();
            await dbUser.save();
            return { items: [], total: 0, updatedAt: new Date() };
        },
        checkout: async (_, __, context) => {
            const user = checkAuth(context);
            // Populate product details in cart
            const dbUser = await User.findById(user.id).populate('cart.items.product');

            const cartItems = dbUser.cart.items.filter(item => item.product);

            if (cartItems.length === 0) {
                throw new GraphQLError('El carrito está vacío');
            }

            // Check stock (Optional but good practice)
            // For now, simplify logic as requested

            const orderItems = cartItems.map(item => ({
                product: item.product._id,
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity,
                lineTotal: item.product.price * item.quantity
            }));

            const total = orderItems.reduce((acc, item) => acc + item.lineTotal, 0);

            const order = new Order({
                user: user.id,
                items: orderItems,
                total,
                status: 'pending'
            });

            await order.save();

            // Clear cart
            dbUser.cart.items = [];
            await dbUser.save();

            // OPTIONAL: Reduce stock here if we were handling inventory

            return order;
        },
        setOrderStatus: async (_, { orderId, status }, context) => {
            checkAdmin(context);
            if (!['pending', 'completed'].includes(status)) {
                throw new GraphQLError('Estado inválido');
            }
            const order = await Order.findByIdAndUpdate(
                orderId,
                { status },
                { new: true }
            ).populate('user');
            return order;
        },
        deleteUser: async (_, { userId }, context) => {
            checkAdmin(context);
            if (userId === context.user.id) {
                throw new GraphQLError('No puedes eliminarte a ti mismo');
            }
            await User.findByIdAndDelete(userId);
            return true;
        },
        changeUserRole: async (_, { userId, role }, context) => {
            checkAdmin(context);
            if (userId === context.user.id) {
                throw new GraphQLError('No puedes cambiar tu propio rol');
            }
            if (!['user', 'admin'].includes(role)) {
                throw new GraphQLError('Rol inválido');
            }
            const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
            return user;
        }
    },

    CartItem: {
        lineTotal: (parent) => {
            if (parent.product && parent.product.price) {
                return parent.product.price * parent.quantity;
            }
            return 0;
        }
    }
};

module.exports = resolvers;
