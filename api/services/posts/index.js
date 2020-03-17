import _ from 'lodash';
import feathersNedb from 'feathers-nedb';
import { SOCKET_KEY } from '@feathersjs/socketio';
import NeDB from 'nedb';
import hooks from './hooks';

const uniqueID = (function UniqueID() {
  let id = 0; // This is the private persistent value
  // The outer function returns a nested function that has access
  // to the persistent value.  It is this nested function we're storing
  // in the variable uniqueID above.
  return function __ID() {
    id += 1;
    return id;
  }; // Return and increment
}()); // Invoke the outer function after defining it.

const getAllVotes = async app => {
  const service = app.service('posts');
  let posts;
  posts = await service.find({
    query: {
      text: '1',
      $limit: 0 // this will count only
    }
  });
  const myVoteUp = posts.total;

  posts = await service.find({
    query: {
      text: '2',
      $limit: 0 // this will count only
    }
  });
  const myVoteDown = posts.total;

  return { down: myVoteDown, up: myVoteUp };
};

const getUserVotes = async (app, user) => {
  const service = app.service('posts');
  let posts;
  if (!user._id) return { down: 0, up: 0 };
  posts = await service.find({
    query: {
      text: '1',
      sentBy: user._id,
      $limit: 0 // this will count only
    }
  });
  const myVoteUp = posts.total;

  posts = await service.find({
    query: {
      text: '2',
      sentBy: user._id,
      $limit: 0 // this will count only
    }
  });
  const myVoteDown = posts.total;

  return { _id: user._id, down: myVoteDown, up: myVoteUp };
};

const updateServerVisitors = async (app, connection) => {
  const { connections } = app.channel('blog');
  const socket = connection[SOCKET_KEY];
  // const socketId = `anon-${socket.id}`;
  console.log(
    JSON.stringify(
      connections.filter(v => v.user),
      null,
      2
    )
  );

  if (!socket.connected) {
    app.service('posts').emit('updateBlogVisitors', {
      authenticated: connections.filter(v => v.user).map(con => con.user)
    });
    return {};
  }

  const arr = connections.filter(v => v.user);
  const votes = await getAllVotes(app);

  const mapCurrentUser = async row => {
    Promise.resolve('ok');
    row.user.vote = await getUserVotes(app, row.user);
    return row.user;
  };

  const results = arr.map(e => mapCurrentUser(e));
  // document.writeln( `Before waiting: ${results}`);

  return Promise.all(results).then(completed => {
    console.log(`\nResult: ${completed}`, completed);
    app.service('posts').emit('updateBlogVisitors', {
      authenticated: _.uniqBy(completed, '_id'),
      votes
    });
  });
};

const updateServerVotes = async (app, data, user) => {
  // const { connections } = app.channel('blog');
  console.log('app.updateBlogVisitors.connections', data);
  const service = app.service('posts');

  await service.create({ text: data.vote, sentBy: user._id });

  const all = await getAllVotes(app);
  const userVotes = await getUserVotes(app, user);

  console.log('emiting.updateVotes', { all, userVotes });
  app.service('posts').emit('updateVotes', {
    // authenticated: _.uniqBy(connections.filter(v => v.user).map(con => con.user), '_id'),
    // anonymous: connections.filter(v => !v.user).length,
    all,
    userVotes
  });
};

export default function postsService(app) {
  const options = {
    Model: new NeDB({
      filename: `${__dirname}/posts.nedb`,
      autoload: true
    }),
    paginate: {
      default: 25,
      max: 100
    },
    events: ['updateBlogVisitors', 'patchedPost', 'updateVotes']
  };

  app.use('/posts', feathersNedb(options));

  const service = app.service('posts');

  service.hooks(hooks);

  service.publish('created', () => app.channel('anonymous', 'authenticated'));

  service.publish('updateBlogVisitors', () => app.channel('blog'));
  service.publish('updateVotes', () => app.channel('blog'));

  app.on('connection', connection => {
    const socket = connection[SOCKET_KEY];
    // const socketId = `anon-${socket.id}`;

    if (!connection.user) {
      connection.ghost = `ghost-${uniqueID()}`;
    }

    socket.on('postVote', async data => {
      console.log('postVote', data, connection.user);
      updateServerVotes(app, data, connection.user);
    });

    socket.on('joinBlog', async () => {
      console.warn('socketio.posts.joinBlog');
      app.channel('blog').join(connection);
      await updateServerVisitors(app, connection);
      // const user = {socketId, ...connection.user, online: true};
      // await updateVoting(app, user);
    });

    socket.on('leaveBlog', async () => {
      console.warn('socketio.posts.leaveBlog');
      app.channel('blog').leave(connection);
      await updateServerVisitors(app, connection);
      // const user = {socketId, ...connection.user, online: false};
      // await updateVoting(app, user);
    });

    socket.on('disconnect', async () => {
      console.warn('socketio.posts.disconnect');
      await updateServerVisitors(app, connection);
      // const user = {socketId, ...connection.user, online: false};
      // await updateVoting(app, user);
    });
  });
}
