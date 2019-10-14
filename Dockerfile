FROM python:3.7
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
RUN cp /usr/share/zoneinfo/America/Denver /etc/localtime
RUN echo "America/Denver" > /etc/timezone
ENTRYPOINT ["python"]
CMD ["app.py"]
