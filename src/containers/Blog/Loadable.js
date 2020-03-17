import React from 'react';
import Loadable from 'react-loadable';

const BlogFeathersLoadable = Loadable({
  loader: () => import('./Blog' /* webpackChunkName: 'blog' */).then(module => module.default),
  loading: () => <div>Loading</div>
});

export default BlogFeathersLoadable;
