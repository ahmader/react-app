import React from 'react';
import PropTypes from 'prop-types';

const SVG = ({
  style = { background: '-webkit-linear-gradient(bottom, black 90%, yellow 10%)', borderRadius: '50%' },
  fill = 'none', // '#fff',
  width = '120',
  height = '120',
  className = 'bg-danger',
  viewBox = '0 50 100 100'
}) => (
  <svg
    width={width}
    style={style}
    height={height}
    viewBox={viewBox}
    xmlns="http://www.w3.org/2000/svg"
    className={`svg-icon ${className || ''}`}
    xmlnsXlink="http://www.w3.org/1999/xlink"
  >
    <g transform="translate(0,60)" fill={fill}>
      <rect width="100" height="100" />
      <circle r="15" fill="black" id="c" cx="25" cy="30" />
      <circle r="15" fill="black" id="c" cx="75" cy="30" />
      <g transform="translate(16,60)">
        <path d="M0,0 A40,40 10 0,0 65,0" fill="none" stroke="black" strokeWidth="5" />
      </g>
    </g>
  </svg>
);

SVG.propTypes = {
  style: PropTypes.string.isRequired,
  fill: PropTypes.string.isRequired,
  width: PropTypes.string.isRequired,
  height: PropTypes.string.isRequired,
  className: PropTypes.string.isRequired,
  viewBox: PropTypes.string.isRequired
};

export default SVG;
