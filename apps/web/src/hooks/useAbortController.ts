import { useEffect, useState } from 'react';
 
 export function useAbortController() {
   const [controller] = useState(() => new AbortController());
 
   useEffect(() => {
     return () => {
       controller.abort();
     };
   }, [controller]);
 
   return controller;
 }
