const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const webAppUrl = process.env.WEB_APP_URL;

const orders = {};

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Добро пожаловать в наш ресторан!', {
        reply_markup: {
            keyboard: [[{ text: 'Открыть меню 🍽️', web_app: { url: webAppUrl } }]],
            resize_keyboard: true
        }
    });
});

bot.on('web_app_data', async (msg) => {
    try {
        const data = JSON.parse(msg.web_app_data.data);
        console.log('Получен заказ из WebApp:', data);

        if (!data.items || data.items.length === 0) {
            await bot.sendMessage(msg.chat.id, 'Ваша корзина пуста!');
            return;
        }

        orders[msg.chat.id] = {
            items: data.items,
            total: data.total,
            timestamp: data.timestamp || new Date().toISOString()
        };

        let orderMessage = '*Ваш заказ:*\n\n';
        
        data.items.forEach(item => {
            const itemTotal = item.totalPrice * item.quantity;
            orderMessage += `*${item.name}* x${item.quantity}\n` +
                          `   Цена: ${item.totalPrice} ₽ за шт\n` +
                          `   Итого: *${itemTotal} ₽*\n`;
            
            if (item.modifiers && item.modifiers.length > 0) {
                orderMessage += `   Добавки: ${item.modifiers.join(', ')}\n`;
            }
            
            orderMessage += '\n';
        });

        const totalAmount = data.items.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);
        orderMessage += `*Общая сумма заказа: ${totalAmount} ₽*\n\n`;

        const options = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Подтвердить заказ', callback_data: 'confirm_order' },
                        { text: '✏️ Добавить комментарий', callback_data: 'add_comment' }
                    ],
                    [
                        { text: '💳 Оплатить онлайн', callback_data: 'pay_online' },
                        { text: '💰 Оплатить при получении', callback_data: 'pay_cash' }
                    ],
                    [
                        { text: '❌ Отменить заказ', callback_data: 'cancel_order' }
                    ]
                ]
            }
        };

        await bot.sendMessage(msg.chat.id, orderMessage, options);
        
    } catch (error) {
        console.error('Ошибка при обработке заказа:', error);
        await bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке вашего заказа. Пожалуйста, попробуйте ещё раз.');
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    try {
        switch (data) {
            case 'confirm_order':
                await bot.answerCallbackQuery(callbackQuery.id, { text: 'Заказ подтверждён!' });
                await processOrder(chatId, 'Заказ подтверждён без комментария');
                break;
                
            case 'add_comment':
                await bot.answerCallbackQuery(callbackQuery.id);
                orders[chatId].waitingForComment = true;
                await bot.sendMessage(chatId, 'Пожалуйста, введите ваш комментарий к заказу:');
                break;
                
            case 'pay_online':
                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.sendMessage(chatId, 'Оплата онлайн. В разработке...');
                break;
                
            case 'pay_cash':
                await bot.answerCallbackQuery(callbackQuery.id, { text: 'Вы выбрали оплату при получении' });
                await bot.sendMessage(chatId, 'Вы сможете оплатить заказ при получении.');
                break;
                
            case 'cancel_order':
                await bot.answerCallbackQuery(callbackQuery.id, { text: 'Заказ отменён' });
                delete orders[chatId];
                await bot.sendMessage(chatId, 'Ваш заказ был отменён. Если это произошло по ошибке, вы можете оформить новый заказ.');
                break;
                
            case 'confirm_with_comment':
                await bot.answerCallbackQuery(callbackQuery.id, { text: 'Заказ подтверждён с комментарием!' });
                await processOrder(chatId, `Заказ подтверждён с комментарием: ${orders[chatId].comment || 'нет комментария'}`);
                break;
        }

        await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: messageId }
        );
        
    } catch (error) {
        console.error('Ошибка обработки callback:', error);
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (orders[chatId] && orders[chatId].waitingForComment) {
        orders[chatId].comment = msg.text;
        orders[chatId].waitingForComment = false;

        await bot.sendMessage(chatId, 'Хотите подтвердить заказ с этим комментарием?', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Да, подтвердить', callback_data: 'confirm_with_comment' },
                        { text: '✏️ Изменить комментарий', callback_data: 'add_comment' }
                    ]
                ]
            }
        });
    }
});

async function processOrder(chatId, status) {
    if (!orders[chatId]) {
        await bot.sendMessage(chatId, 'Ошибка: данные заказа не найдены. Пожалуйста, создайте заказ заново.');
        return;
    }
    
    const order = orders[chatId];
    
    console.log('Обработка заказа:', {
        chatId,
        items: order.items,
        total: order.total,
        comment: order.comment,
        status,
        timestamp: order.timestamp
    });
    
    await bot.sendMessage(chatId, 'Ваш заказ принят в обработку! Номер заказа: #' + Math.floor(Math.random() * 10000));
    
    delete orders[chatId];
}