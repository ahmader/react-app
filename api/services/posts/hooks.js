import auth from '@feathersjs/authentication';
import local from '@feathersjs/authentication-local';
import { restrictToOwner } from 'feathers-authentication-hooks';
import {
  fastJoin, disallow, iff, isProvider, keep
} from 'feathers-hooks-common';
import { required } from 'utils/validation';
import { validateHook as validate } from 'hooks';
import logger from 'utils/logger';

const schemaValidator = {
  text: required
};

function joinResolvers(context) {
  const { app } = context;
  const users = app.service('users');
  return {
    joins: {
      author: () => async post => {
        const author = post.sentBy ? await users.get(post.sentBy) : null;
        post.author = author;
        return post;
      }
    }
  };
}

const joinAuthor = [
  fastJoin(joinResolvers, {
    author: true
  }),
  local.hooks.protect('author.password')
];

const postsHooks = {
  before: {
    all: [logger()],
    find: [],
    get: [],
    create: [
      validate(schemaValidator),
      context => {
        const { data, params } = context;
        console.log('message.create', { data, params });

        context.data = {
          text: data.text,
          sentBy: data.sentBy || (params.user ? params.user._id : null), // Set the id of current user
          createdAt: new Date()
        };
      }
    ],
    update: disallow(),
    patch: [
      auth.hooks.authenticate('jwt'),
      restrictToOwner({ ownerField: 'sentBy' }),
      // context => {console.log('isProvider', context.params.provider);}, // the next function is check this value
      iff(isProvider('external'), keep('text')),
      async context => {
        const { id, data, app } = context;
        const post = await app.service('posts').get(id);
        const history = post.history || [];
        history.push({ createdAt: post.updatedAt || post.createdAt, text: post.text });
        console.log(JSON.stringify(context, null, 2));
        context.data = {
          text: data.text,
          updatedAt: new Date(),
          history
        };
      }
    ],
    remove: disallow()
  },
  after: {
    all: [logger()],
    find: [],
    // find: joinAuthor,
    get: joinAuthor,
    create: joinAuthor,
    update: [],
    patch: joinAuthor.concat([
      context => {
        const { app, result } = context;
        app.service('posts').emit('patchedPost', result);
      }
    ]),
    remove: []
  },
  error: {
    all: [logger()]
  }
};

export default postsHooks;
