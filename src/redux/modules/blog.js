const LOAD = 'redux-example/blog/LOAD';
const LOAD_SUCCESS = 'redux-example/blog/LOAD_SUCCESS';
const LOAD_FAIL = 'redux-example/blog/LOAD_FAIL';
const LIST_VISITORS = 'redux-example/blog/LIST_VISITORS';
const LIST_VISITORS_SUCCESS = 'redux-example/blog/LIST_VISITORS_SUCCESS';
const LIST_VISITORS_FAIL = 'redux-example/blog/LIST_VISITORS_FAIL';
const UPDATE_VISITORS = 'redux-example/blog/UPDATE_VISITORS';
const UPDATE_VOTES = 'redux-example/blog/UPDATE_VOTES';
const ADD_MESSAGE = 'redux-example/blog/ADD_MESSAGE';
const PATCH_MESSAGE = 'redux-example/blog/PATCH_MESSAGE';
const PATCH_MESSAGE_SUCCESS = 'redux-example/blog/PATCH_MESSAGE_SUCCESS';
const PATCH_MESSAGE_FAIL = 'redux-example/blog/PATCH_MESSAGE_FAIL';
const PATCHED_MESSAGE = 'redux-example/blog/PATCHED_MESSAGE';

const initialState = {
  loaded: false,
  posts: [],
  votes: {
    up: 0,
    down: 0
  }
};

export default function reducer(state = initialState, action = {}) {
  const votes = action.visitors.votes || state.visitors.votes;
  const visitors = action.visitors || state.visitors;

  switch (action.type) {
    case LOAD:
      return {
        ...state,
        loading: true
      };
    case LOAD_SUCCESS:
      return {
        ...state,
        loading: false,
        loaded: true,
        posts: action.result.data.reverse()
      };
    case LOAD_FAIL:
      return {
        ...state,
        loading: false,
        loaded: false,
        error: action.error
      };
    case LIST_VISITORS_SUCCESS:
      return {
        ...state,
        visitors: action.result
      };
    case UPDATE_VISITORS:
      visitors.authenticated = visitors.authenticated.map(v => {
        const vititor = v;
        return vititor;
      });

      return {
        ...state,
        visitors: { ...state.visitors, ...visitors.authenticated, votes }

        // byIds: {...state.byIds, ...action.byIds}
      };
    case UPDATE_VOTES:
      visitors.authenticated = !action.votes.userVotes
        ? state.visitors.authenticated
        : state.visitors.authenticated.map(v => {
          const vititor = v;
          if (v._id === action.votes.userVotes._id) {
            vititor.vote = Object.assign({}, vititor.vote, action.votes.userVotes);
          }
          return vititor;
        });

      return {
        ...state,
        visitors: { ...state.visitors, authenticated: visitors.authenticated, votes: action.votes.all }
      };
    case ADD_MESSAGE:
      return {
        ...state,
        posts: state.posts.concat(action.post)
      };
    case PATCHED_MESSAGE:
      return {
        ...state,
        posts: state.posts.map(post => (post._id === action.post._id ? action.post : post))
      };
    case PATCH_MESSAGE_SUCCESS:
      return {
        ...state,
        posts: state.posts.map(post => (post._id === action.result._id ? action.result : post))
      };
    default:
      return state;
  }
}

export function isLoaded(globalState) {
  return globalState.blog && globalState.blog.loaded;
}

export function load() {
  return {
    types: [LOAD, LOAD_SUCCESS, LOAD_FAIL],
    promise: ({ app }) => app.service('posts').find({
      query: {
        $sort: { createdAt: -1 },
        $limit: 25
      }
    })
  };
}

export function listVisitors() {
  return {
    types: [LIST_VISITORS, LIST_VISITORS_SUCCESS, LIST_VISITORS_FAIL],
    promise: async ({ client }) => client.get('/visitors')
  };
}

export function updateBlogVisitors(visitors) {
  return {
    type: UPDATE_VISITORS,
    visitors
  };
}

export function updateVotes(votes) {
  console.log('reducer.updateVotes', votes);

  return {
    type: UPDATE_VOTES,
    votes
  };
}

export function addMessage(post) {
  return {
    type: ADD_MESSAGE,
    post
  };
}

export function patchMessage(id, data) {
  return {
    types: [PATCH_MESSAGE, PATCH_MESSAGE_SUCCESS, PATCH_MESSAGE_FAIL],
    promise: ({ app }) => app.service('posts').patch(id, data)
  };
}

export function patchedMessage(post) {
  return {
    type: PATCHED_MESSAGE,
    post
  };
}
