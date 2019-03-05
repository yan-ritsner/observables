/* Service fields enum */
export enum Fields {
  /** Field name in target prototype that stores next prop id */
  PropId = 'xPropId',
  /** Field name in target prototype that stores prop id map by prop name */
  Props = 'xProps',
  /** Field name in target prototype that stores prop name map by prop id */
  PropNames = 'xPropNames',
  /** Field name in target object that stores observable data */
  Data = 'xData',
  /** Field name in component that stores computed jxs element returned from render */
  ComputedRender = 'xComputedRender',
  /** Field name in component that that indicates that render is cased by reaction */
  ReactingRender = 'xReactingRender',
  /** Revision field used by observable array to store array revision number */
  Revision = 'xRevision',
}
