const router = require('express').Router();
const { authorOnly } = require('../middlewares/auth');
const authorController = require('../controllers/authorController');
const ticketController = require('../controllers/ticketController');

router.use(authorOnly);

router.get('/profile', authorController.getProfile);
router.patch('/profile', authorController.updateProfile);
router.get('/books', authorController.getMyBooks);
router.get('/book/:book_id', authorController.getBookById);
router.post('/tickets', ticketController.createTicket);
router.get('/tickets', ticketController.getMyTickets);
router.get('/tickets/:ticket_id', ticketController.getMyTicketById);

module.exports = router;