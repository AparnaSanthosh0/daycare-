import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Product3DViewerDemo from './components/Product3DViewerDemo';

// Quick demo route component
function Demo3D() {
  return <Product3DViewerDemo />;
}

export default Demo3D;
