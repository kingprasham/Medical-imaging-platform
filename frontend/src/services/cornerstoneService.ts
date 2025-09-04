import { init as csRenderInit } from '@cornerstonejs/core';
import { init as csToolsInit, addTool, WindowLevelTool, PanTool, ZoomTool, StackScrollMouseWheelTool } from '@cornerstonejs/tools';
import {
  cornerstoneStreamingImageVolumeLoader,
  cornerstoneStreamingDynamicImageVolumeLoader,
} from '@cornerstonejs/streaming-image-volume-loader';
import dicomLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstone from '@cornerstonejs/core';

// This function initializes the Cornerstone.js services
export default async function initCornerstone(): Promise<void> {
  // Initialize the main Cornerstone rendering and tools services
  await csRenderInit();
  csToolsInit();

  // Add the tools we will use
  addTool(WindowLevelTool);
  addTool(PanTool);
  addTool(ZoomTool);
  addTool(StackScrollMouseWheelTool);

  // Configure the web worker manager
  const config = {
    maxWebWorkers: navigator.hardwareConcurrency || 1,
    startWebWorkersOnDemand: true,
    taskConfiguration: {
      decodeTask: {
        initializeCodecsOnMainThread: false,
        usePDFJS: false,
        strict: false,
      },
    },
  };
  
  // This is a type assertion to work around a library type issue
  (dicomLoader as any).webWorkerManager.initialize(config);

  // Register the volume loaders
  cornerstone.volumeLoader.registerVolumeLoader(
    'cornerstoneStreamingImageVolume',
    cornerstoneStreamingImageVolumeLoader as any
  );
  cornerstone.volumeLoader.registerVolumeLoader(
    'cornerstoneStreamingDynamicImageVolume',
    cornerstoneStreamingDynamicImageVolumeLoader as any
  );

  console.log("Cornerstone.js initialized successfully.");
}

