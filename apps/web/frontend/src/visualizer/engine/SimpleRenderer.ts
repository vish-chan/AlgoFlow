export class SimpleRenderer {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private data: any = null;
    private containerHeight: number = 0;

    mount(container: HTMLElement) {
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.display = 'block';
        this.canvas.style.background = '#111';
        container.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.containerHeight = container.clientHeight;
        this.resize();
        window.addEventListener('resize', this.resize);
    }

    unmount() {
        window.removeEventListener('resize', this.resize);
        if (this.canvas?.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
    }

    private resize = () => {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Calculate required height based on content
        let requiredHeight = this.containerHeight;
        if (this.data?.type === 'log' && this.data.logs) {
            requiredHeight = Math.max(this.containerHeight, 50 + this.data.logs.length * 20);
        } else if (this.data?.type === 'layout' && this.data.children) {
            requiredHeight = Math.max(this.containerHeight, this.data.children.length * 150);
        }
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = requiredHeight * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = requiredHeight + 'px';
        
        this.render();
    };

    setData(data: any) {
        this.data = data;
        this.resize();
    }

    private render() {
        if (!this.ctx || !this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        
        this.ctx.clearRect(0, 0, width, height);
        
        if (!this.data) return;

        if (this.data.type === 'array') {
            this.renderArray(this.data.data, this.data.title);
        } else if (this.data.type === 'array2d') {
            this.renderArray2D(this.data.data, this.data.title);
        } else if (this.data.type === 'log') {
            this.renderLog(this.data.logs, this.data.title);
        } else if (this.data.type === 'recursion') {
            this.renderRecursion(this.data.calls, this.data.title);
        } else if (this.data.type === 'variables') {
            this.renderVariables(this.data.vars, this.data.title, this.data.patchState);
        } else if (this.data.type === 'layout') {
            this.renderLayout(this.data.children);
        } else {
            this.renderText(JSON.stringify(this.data, null, 2));
        }
    }

    private renderArray(arr: any[], title?: string) {
        if (!this.ctx || !this.canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;

        const cellWidth = 80;
        const cellHeight = 60;
        const totalWidth = arr.length * cellWidth;
        const startX = (width - totalWidth) / 2;
        const y = (height - cellHeight) / 2;

        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(title, width / 2, y - 15);
        }

        arr.forEach((item, i) => {
            const value = typeof item === 'object' ? item.value : item;
            const selected = typeof item === 'object' ? item.selected : false;
            const patched = typeof item === 'object' ? item.patched : false;
            const x = startX + i * cellWidth;

            this.ctx!.fillStyle = patched ? '#f44336' : (selected ? '#2196F3' : '#333');
            this.ctx!.fillRect(x + 2, y, cellWidth - 4, cellHeight);

            this.ctx!.strokeStyle = '#666';
            this.ctx!.strokeRect(x + 2, y, cellWidth - 4, cellHeight);

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '16px monospace';
            this.ctx!.textAlign = 'center';
            this.ctx!.fillText(String(value), x + cellWidth / 2, y + cellHeight / 2 + 6);

            this.ctx!.fillStyle = '#888';
            this.ctx!.font = '12px monospace';
            this.ctx!.fillText(String(i), x + cellWidth / 2, y + cellHeight + 20);
        });
    }

    private renderText(text: string) {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        
        const lines = text.split('\n');
        lines.forEach((line, i) => {
            this.ctx!.fillText(line, 20, 30 + i * 20);
        });
    }

    private renderLog(logs: any[], title?: string) {
        if (!this.ctx) return;
        
        let y = 30;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, 20, y);
            y += 25;
        }
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px monospace';
        
        logs.forEach(log => {
            const text = String(log);
            const lines = text.split('\n');
            lines.forEach(line => {
                this.ctx!.fillText(line, 20, y);
                y += 20;
            });
        });
    }

    private renderLayout(children: any[]) {
        if (!this.ctx || !this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        
        const sectionHeight = height / children.length;
        
        children.forEach((child, i) => {
            const y = i * sectionHeight;
            
            this.ctx!.save();
            this.ctx!.translate(0, y);
            this.ctx!.beginPath();
            this.ctx!.rect(0, 0, this.canvas!.width, sectionHeight);
            this.ctx!.clip();
            
            if (child?.type === 'array' && child.data) {
                this.renderArrayInBounds(child.data, child.title, 0, 0, width, sectionHeight);
            } else if (child?.type === 'array2d' && child.data) {
                this.renderArray2DInBounds(child.data, child.title, 0, 0, width, sectionHeight);
            } else if (child?.type === 'log' && child.logs) {
                this.renderLogInBounds(child.logs, child.title, 0, 0);
            } else if (child?.type === 'recursion' && child.calls) {
                this.renderRecursionInBounds(child.calls, child.title, 0, 0, width, sectionHeight);
            } else if (child?.type === 'variables' && child.vars) {
                this.renderVariablesInBounds(child.vars, child.title, 0, 0, width, sectionHeight, child.patchState);
            }
            
            this.ctx!.restore();
            
            if (i < children.length - 1) {
                this.ctx!.strokeStyle = '#444';
                this.ctx!.beginPath();
                this.ctx!.moveTo(0, (i + 1) * sectionHeight);
                this.ctx!.lineTo(width, (i + 1) * sectionHeight);
                this.ctx!.stroke();
            }
        });
    }

    private renderArrayInBounds(arr: any[], title: string | undefined, x: number, y: number, width: number, height: number) {
        if (!this.ctx) return;

        const cellWidth = 60;
        const cellHeight = 40;
        const totalWidth = arr.length * cellWidth;
        const startX = x + (width - totalWidth) / 2;
        const startY = y + (height - cellHeight) / 2;

        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(title, x + width / 2, startY - 10);
        }

        arr.forEach((item, i) => {
            const value = typeof item === 'object' ? item.value : item;
            const selected = typeof item === 'object' ? item.selected : false;
            const patched = typeof item === 'object' ? item.patched : false;
            const cx = startX + i * cellWidth;

            this.ctx!.fillStyle = patched ? '#f44336' : (selected ? '#2196F3' : '#333');
            this.ctx!.fillRect(cx + 2, startY, cellWidth - 4, cellHeight);

            this.ctx!.strokeStyle = '#666';
            this.ctx!.strokeRect(cx + 2, startY, cellWidth - 4, cellHeight);

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '14px monospace';
            this.ctx!.textAlign = 'center';
            this.ctx!.fillText(String(value), cx + cellWidth / 2, startY + cellHeight / 2 + 5);
            
            this.ctx!.fillStyle = '#888';
            this.ctx!.font = '10px monospace';
            this.ctx!.fillText(String(i), cx + cellWidth / 2, startY + cellHeight + 15);
        });
    }

    private renderLogInBounds(logs: any[], title: string | undefined, x: number, y: number) {
        if (!this.ctx) return;
        
        let ly = y + 20;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, x + 10, ly);
            ly += 20;
        }
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
        
        logs.forEach(log => {
            const text = String(log);
            this.ctx!.fillText(text, x + 10, ly);
            ly += 16;
        });
    }

    private renderArray2D(rows: any[][], title?: string) {
        if (!this.ctx || !this.canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;

        const cellWidth = 200;
        const cellHeight = 30;
        const startY = 50;

        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(title, width / 2, 25);
        }

        rows.forEach((row, rowIdx) => {
            const y = startY + rowIdx * cellHeight;
            row.forEach((item, colIdx) => {
                const value = typeof item === 'object' ? item.value : item;
                const selected = typeof item === 'object' ? item.selected : false;
                const patched = typeof item === 'object' ? item.patched : false;
                const x = 20 + colIdx * cellWidth;

                this.ctx!.fillStyle = patched ? '#f44336' : (selected ? '#2196F3' : '#333');
                this.ctx!.fillRect(x, y, cellWidth - 4, cellHeight);

                this.ctx!.strokeStyle = '#666';
                this.ctx!.strokeRect(x, y, cellWidth - 4, cellHeight);

                this.ctx!.fillStyle = '#fff';
                this.ctx!.font = '12px monospace';
                this.ctx!.textAlign = 'left';
                this.ctx!.fillText(String(value), x + 8, y + cellHeight / 2 + 4);
            });
        });
    }

    private renderArray2DInBounds(rows: any[][], title: string | undefined, x: number, y: number, width: number, height: number) {
        if (!this.ctx) return;

        console.log('Rendering Array2D in bounds:', { title, rows, rowCount: rows?.length });

        const cellSize = 35;
        const gridWidth = rows[0]?.length * cellSize || 0;
        const gridHeight = rows.length * cellSize;
        const startX = x + (width - gridWidth) / 2;
        const startY = y + (height - gridHeight) / 2 + 20;

        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(title, x + width / 2, startY - 10);
        }

        rows.forEach((row, rowIdx) => {
            row.forEach((item, colIdx) => {
                const value = typeof item === 'object' ? item.value : item;
                const selected = typeof item === 'object' ? item.selected : false;
                const patched = typeof item === 'object' ? item.patched : false;
                const cx = startX + colIdx * cellSize;
                const cy = startY + rowIdx * cellSize;

                this.ctx!.fillStyle = patched ? '#f44336' : (selected ? '#2196F3' : '#2a2a2a');
                this.ctx!.fillRect(cx, cy, cellSize, cellSize);

                this.ctx!.strokeStyle = '#444';
                this.ctx!.lineWidth = 1;
                this.ctx!.strokeRect(cx, cy, cellSize, cellSize);

                this.ctx!.fillStyle = '#fff';
                this.ctx!.font = '12px monospace';
                this.ctx!.textAlign = 'center';
                this.ctx!.textBaseline = 'middle';
                this.ctx!.fillText(String(value), cx + cellSize / 2, cy + cellSize / 2);
            });
        });
    }

    private renderRecursion(calls: any[], title?: string) {
        if (!this.ctx || !this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        
        let y = 30;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, 20, y);
            y += 30;
        }
        
        calls.forEach((call, i) => {
            const indent = i * 20;
            const x = 20 + indent;
            
            this.ctx!.fillStyle = call.patched ? '#f44336' : (call.active ? '#4CAF50' : '#666');
            this.ctx!.fillRect(x, y - 15, width - x - 20, 25);
            
            this.ctx!.strokeStyle = '#888';
            this.ctx!.strokeRect(x, y - 15, width - x - 20, 25);
            
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '12px monospace';
            this.ctx!.textAlign = 'left';
            const params = call.params.join(', ');
            this.ctx!.fillText(`${call.method}${params}`, x + 8, y);
            
            y += 30;
        });
    }
    
    private renderVariables(vars: Record<string, any>, title?: string, patchState?: Record<string, any>) {
        if (!this.ctx || !this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        
        let y = 30;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, 20, y);
            y += 30;
        }
        
        Object.entries(vars).forEach(([name, value]) => {
            const isPatched = patchState?.[name]?.patched;
            const displayValue = typeof value === 'object' ? value.value : value;
            
            this.ctx!.fillStyle = isPatched ? '#f44336' : '#333';
            this.ctx!.fillRect(20, y - 15, width - 40, 25);
            
            this.ctx!.strokeStyle = '#666';
            this.ctx!.strokeRect(20, y - 15, width - 40, 25);
            
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '12px monospace';
            this.ctx!.textAlign = 'left';
            this.ctx!.fillText(`${name} = ${displayValue}`, 28, y);
            
            y += 30;
        });
    }
    
    private renderRecursionInBounds(calls: any[], title: string | undefined, x: number, y: number, width: number, height: number) {
        if (!this.ctx) return;
        
        let ly = y + 20;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, x + 10, ly);
            ly += 25;
        }
        
        calls.forEach((call, i) => {
            const indent = Math.min(i * 15, width * 0.3);
            const cx = x + 10 + indent;
            const cw = width - indent - 20;
            
            this.ctx!.fillStyle = call.patched ? '#f44336' : (call.active ? '#4CAF50' : '#666');
            this.ctx!.fillRect(cx, ly - 12, cw, 20);
            
            this.ctx!.strokeStyle = '#888';
            this.ctx!.strokeRect(cx, ly - 12, cw, 20);
            
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '10px monospace';
            this.ctx!.textAlign = 'left';
            const params = call.params.join(', ');
            this.ctx!.fillText(`${call.method}${params}`, cx + 4, ly);
            
            ly += 22;
        });
    }
    
    private renderVariablesInBounds(vars: Record<string, any>, title: string | undefined, x: number, y: number, width: number, height: number, patchState?: Record<string, any>) {
        if (!this.ctx) return;
        
        let ly = y + 20;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, x + 10, ly);
            ly += 25;
        }
        
        Object.entries(vars).forEach(([name, value]) => {
            const isPatched = patchState?.[name]?.patched;
            const displayValue = typeof value === 'object' ? value.value : value;
            
            this.ctx!.fillStyle = isPatched ? '#f44336' : '#333';
            this.ctx!.fillRect(x + 10, ly - 12, width - 20, 20);
            
            this.ctx!.strokeStyle = '#666';
            this.ctx!.strokeRect(x + 10, ly - 12, width - 20, 20);
            
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '10px monospace';
            this.ctx!.textAlign = 'left';
            this.ctx!.fillText(`${name} = ${displayValue}`, x + 14, ly);
            
            ly += 22;
        });
    }
}