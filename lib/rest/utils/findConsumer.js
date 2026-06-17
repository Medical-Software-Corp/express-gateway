import userService from '../../services/consumers/user.service.js';
import appService from '../../services/consumers/application.service.js';

export default function findConsumer (id) {
  return userService.findByUsernameOrId(id)
    .then(user => {
      if (user) {
        return user;
      }
      return appService.findByNameOrId(id);
    });
}
