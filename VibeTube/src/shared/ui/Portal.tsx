// Portal.tsx
import { useEffect, useState, ReactNode } from "react";
import ReactDOM from "react-dom";

interface PortalProps {
  children: ReactNode;
}

const Portal = ({ children }: PortalProps) => {
  const [container] = useState(() => {
    const div = document.createElement("div");
    div.id = "portal-root"; // Опциональный ID для DOM
    return div;
  });

  useEffect(() => {
    // В момент монтирования компонента добавляем div в конец <body>
    document.body.appendChild(container);
    return () => {
      // При размонтировании — удаляем
      document.body.removeChild(container);
    };
  }, [container]);

  // Магия React: рендерим детей внутри созданного div, который находится в корне DOM
  return ReactDOM.createPortal(children, container);
};

export default Portal;