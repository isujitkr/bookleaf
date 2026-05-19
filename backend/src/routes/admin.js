const router = require('express').Router();
const { adminOnly } = require('../middlewares/auth');
const authorController = require('../controllers/authorController');
const ticketController = require('../controllers/ticketController');

// All routes require admin auth
router.use(adminOnly);

router.get('/tickets/stats', ticketController.adminGetStats);
router.get('/tickets', ticketController.adminGetTickets);
router.get('/tickets/:ticket_id', ticketController.adminGetTicketById);
router.patch('/tickets/:ticket_id', ticketController.adminUpdateTicket);
router.post('/tickets/:ticket_id/respond', ticketController.adminRespondToTicket);
router.get('/tickets/:ticket_id/draft', ticketController.adminGetDraftResponse);
router.get('/authors', authorController.getAllAuthors);
router.get('/authors/:author_id', authorController.getAuthorById);

module.exports = router;